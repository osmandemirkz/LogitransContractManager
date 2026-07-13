import { createClient, FunctionsHttpError } from '@supabase/supabase-js';
import type { ExtraSheet } from '@/hooks/useAuth';

export type { ExtraSheet };

export interface MainSheet {
  id: string;
  spreadsheet_id: string;
  sheet_name: string;
  label: string;
  is_active: boolean;
  sort_order: number;
}

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/** Fetch all active main sheets from DB */
export async function getMainSheets(): Promise<MainSheet[]> {
  const { data, error } = await supabase
    .from('logitrans_main_sheets')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('[sheetsApi] getMainSheets error:', error.message);
    return [];
  }
  return (data || []) as MainSheet[];
}

/** Add a new main sheet */
export async function addMainSheet(sheet: Omit<MainSheet, 'id'>): Promise<MainSheet> {
  const id = `main_${Date.now()}`;
  const { data, error } = await supabase
    .from('logitrans_main_sheets')
    .insert({ ...sheet, id })
    .select()
    .single();
  if (error) throw error;
  return data as MainSheet;
}

/** Update a main sheet */
export async function updateMainSheet(id: string, updates: Partial<MainSheet>): Promise<void> {
  const { error } = await supabase
    .from('logitrans_main_sheets')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

/** Delete a main sheet */
export async function deleteMainSheet(id: string): Promise<void> {
  const { error } = await supabase
    .from('logitrans_main_sheets')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export interface SheetContractRow {
  contractNumber: string;
  contractDate: string;
  manager: string;
  expeditor: string;
  clientName: string;
  sector?: string;
  country: string;
  city: string;
  address?: string;
  director: string;
  email: string;
  mobilePhone?: string;
  officePhone?: string;
  bin?: string;
  currency: string;
  contractAmount?: string;
  account?: string;
  bankName?: string;
  swift?: string;
  status: string;
  pdfLink?: string;
}

/** Upload a PDF file to Supabase Storage (contract-pdfs / musteri-anlasmalar), return public URL */
export async function uploadContractPdf(
  pdfBlob: Blob,
  contractNumber: string,
  contractDate?: string,
  clientName?: string,
): Promise<string> {
  const datePart = (contractDate || new Date().toLocaleDateString('ru-RU'));
  const safeName = (clientName || 'Dogovor')
    .replace(/[\\/:*?"<>|\s]/g, '_')
    .substring(0, 60)
    .trim();
  const safeNumber = (contractNumber || 'draft').replace(/[\/\\]/g, '-');
  // Format: "АО_TEXNOLOG_Договор_№_UZ01-26_от_21.05.2026.pdf"
  const fileName = `${safeName}_Договор_№_${safeNumber}_от_${datePart}.pdf`;
  const storagePath = `musteri-anlasmalar/${fileName}`;

  console.log('[uploadPdf] Uploading to Supabase Storage:', storagePath);

  const { data, error } = await supabase.storage
    .from('contract-pdfs')
    .upload(storagePath, pdfBlob, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) {
    console.error('[uploadPdf] Storage error:', error.message);
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('contract-pdfs')
    .getPublicUrl(data.path);

  const publicUrl = urlData.publicUrl;
  console.log('[uploadPdf] Upload success, URL:', publicUrl);
  return publicUrl;
}

/** Convert ISO date (YYYY-MM-DD) or any parseable date string to dd.mm.yyyy */
function toDisplayDate(dateStr: string): string {
  if (!dateStr) return dateStr;
  // Already in dd.mm.yyyy format
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) return dateStr;
  // ISO format YYYY-MM-DD or datetime
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/** Save / update contract row in Google Sheets (all active main sheets + optional extra sheets array) */
export async function saveContractToSheet(
  row: SheetContractRow,
  extraSheets?: ExtraSheet[] | string,
  extraSheetName?: string,
): Promise<void> {
  const basePayload = { ...row, contractDate: toDisplayDate(row.contractDate) };

  // 1. Fetch active main sheets from DB
  const mainSheets = await getMainSheets();
  const activeMain = mainSheets.filter(s => s.is_active && s.spreadsheet_id?.trim() && s.sheet_name?.trim());

  // Fallback: if no main sheets in DB, use Edge Function default (hardcoded in function)
  if (activeMain.length === 0) {
    console.log('[sheetsApi] No main sheets in DB, using Edge Function default');
    const payload = { ...basePayload, action: 'append' };
    const { data, error } = await supabase.functions.invoke('sheets-contract', { body: payload });
    console.log('[sheetsApi] Default response:', JSON.stringify(data), 'error:', error?.message);
    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try { const text = await error.context?.text(); msg = `[${error.context?.status}] ${text || msg}`; } catch { /* ignore */ }
      }
      throw new Error(msg);
    }
  } else {
    // 2. Save to all active main sheets
    for (const mainSheet of activeMain) {
      console.log('[sheetsApi] Saving to main sheet:', mainSheet.label, '/', mainSheet.sheet_name);
      const payload = {
        ...basePayload,
        action: 'append',
        targetSpreadsheetId: mainSheet.spreadsheet_id,
        targetSheetName: mainSheet.sheet_name,
      };
      const { data, error } = await supabase.functions.invoke('sheets-contract', { body: payload });
      console.log('[sheetsApi] Main sheet response:', JSON.stringify(data), 'error:', error?.message);
      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) {
          try { const text = await error.context?.text(); msg = `[${error.context?.status}] ${text || msg}`; } catch { /* ignore */ }
        }
        // First main sheet failure is fatal (re-throw), subsequent are logged
        if (mainSheet === activeMain[0]) throw new Error(msg);
        else console.warn('[sheetsApi] Secondary main sheet failed (non-fatal):', msg);
      } else {
        console.log('[sheetsApi] Main sheet save SUCCESS:', mainSheet.sheet_name);
      }
    }
  }

  // 3. Normalize extra sheets: support both new array format and legacy string params
  let sheets: ExtraSheet[] = [];
  if (Array.isArray(extraSheets)) {
    sheets = extraSheets.filter(s => s.spreadsheet_id?.trim() && s.sheet_name?.trim());
  } else if (typeof extraSheets === 'string' && extraSheets.trim() && extraSheetName?.trim()) {
    sheets = [{ spreadsheet_id: extraSheets.trim(), sheet_name: extraSheetName.trim() }];
  }

  // 4. Save to each extra sheet
  for (const sheet of sheets) {
    console.log('[sheetsApi] Also saving to extra spreadsheet:', sheet.spreadsheet_id, '/', sheet.sheet_name);
    const extraPayload = {
      ...basePayload,
      action: 'append',
      targetSpreadsheetId: sheet.spreadsheet_id,
      targetSheetName: sheet.sheet_name,
    };
    const { error: extraError } = await supabase.functions.invoke('sheets-contract', {
      body: extraPayload,
    });
    if (extraError) {
      let msg = extraError.message;
      if (extraError instanceof FunctionsHttpError) {
        try {
          const text = await extraError.context?.text();
          msg = `[${extraError.context?.status}] ${text || msg}`;
        } catch { /* ignore */ }
      }
      console.warn('[sheetsApi] Extra spreadsheet save failed (non-fatal):', msg);
    } else {
      console.log('[sheetsApi] Extra spreadsheet save SUCCESS:', sheet.sheet_name);
    }
  }
}

/** Delete contract row from Google Sheets (all active main sheets + extra sheets) */
export async function deleteContractFromSheet(
  contractNumber: string,
  extraSheets?: ExtraSheet[] | string,
  extraSheetName?: string,
): Promise<void> {
  // 1. Fetch active main sheets from DB
  const mainSheets = await getMainSheets();
  const activeMain = mainSheets.filter(s => s.is_active && s.spreadsheet_id?.trim() && s.sheet_name?.trim());

  if (activeMain.length === 0) {
    // Fallback: use Edge Function default
    const { data, error } = await supabase.functions.invoke('sheets-contract', {
      body: { action: 'delete', contractNumber },
    });
    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try { const text = await error.context?.text(); msg = `[${error.context?.status}] ${text || msg}`; } catch { /* ignore */ }
      }
      throw new Error(msg);
    }
  } else {
    // Delete from each active main sheet
    for (const mainSheet of activeMain) {
      const { error } = await supabase.functions.invoke('sheets-contract', {
        body: { action: 'delete', contractNumber, targetSpreadsheetId: mainSheet.spreadsheet_id, targetSheetName: mainSheet.sheet_name },
      });
      if (error) {
        console.warn('[sheetsApi] Main sheet delete failed (non-fatal):', error.message);
      } else {
        console.log('[sheetsApi] Main sheet delete SUCCESS:', mainSheet.sheet_name);
      }
    }
  }

  // Normalize extra sheets
  let sheets: ExtraSheet[] = [];
  if (Array.isArray(extraSheets)) {
    sheets = extraSheets.filter(s => s.spreadsheet_id?.trim() && s.sheet_name?.trim());
  } else if (typeof extraSheets === 'string' && extraSheets.trim() && extraSheetName?.trim()) {
    sheets = [{ spreadsheet_id: extraSheets.trim(), sheet_name: extraSheetName.trim() }];
  }

  // 2. Delete from each extra sheet
  for (const sheet of sheets) {
    console.log('[sheetsApi] Also deleting from extra spreadsheet:', sheet.spreadsheet_id, '/', sheet.sheet_name);
    const { error: extraError } = await supabase.functions.invoke('sheets-contract', {
      body: {
        action: 'delete',
        contractNumber,
        targetSpreadsheetId: sheet.spreadsheet_id,
        targetSheetName: sheet.sheet_name,
      },
    });
    if (extraError) {
      console.warn('[sheetsApi] Extra spreadsheet delete failed (non-fatal):', extraError.message);
    } else {
      console.log('[sheetsApi] Extra spreadsheet delete SUCCESS:', sheet.sheet_name);
    }
  }
}
