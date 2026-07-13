/**
 * Supabase-backed draft storage API.
 * Replaces localStorage-only draft operations.
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export interface SupplementaryAgreement {
  url: string;
  name: string;
  uploadedAt: string;
}

export interface Draft {
  id: string;
  contractNumber: string;
  clientName: string;
  expeditorId: string;
  createdAt?: string;
  updatedAt: string;
  createdBy?: string;
  /** Manager assigned by admin (may differ from createdBy) */
  managerId?: string;
  formData: any;
  /**
   * draft   = form açıldı, henüz Сохранить'e basılmadı (20 gün sonra otomatik silinir)
   * pending = Сохранить ile kaydedildi, imza bekleniyor
   * signed  = PDF yüklendi, imzalandı
   */
  status?: 'draft' | 'pending' | 'signed';
  pdfUrl?: string;
  signedAt?: string;
  /** Supplementary agreements (Доп1, Доп2, ...) */
  supplementaryAgreements?: SupplementaryAgreement[];
}

// ── Row mapping ────────────────────────────────────────────────────────────────

/** Drafts older than 20 days that are still in 'draft' status should be auto-deleted */
export const DRAFT_EXPIRE_DAYS = 20;

function rowToDraft(row: any): Draft {
  return {
    id: row.id,
    contractNumber: row.contract_number || '',
    clientName: row.client_name || '',
    expeditorId: row.expeditor_id || 'logitrans_uz',
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    managerId: row.manager_id || undefined,
    status: (row.status as 'draft' | 'pending' | 'signed') || 'draft',
    pdfUrl: row.pdf_url || undefined,
    signedAt: row.signed_at || undefined,
    supplementaryAgreements: row.supplementary_agreements || [],
    formData: row.form_data || {},
  };
}

function draftToRow(draft: Draft) {
  return {
    id: draft.id,
    contract_number: draft.contractNumber,
    client_name: draft.clientName,
    expeditor_id: draft.expeditorId,
    created_at: draft.createdAt || new Date().toISOString(),
    updated_at: draft.updatedAt,
    created_by: draft.createdBy || null,
    manager_id: draft.managerId || null,
    status: draft.status || 'draft',
    pdf_url: draft.pdfUrl || null,
    supplementary_agreements: draft.supplementaryAgreements || [],
    form_data: draft.formData,
  };
}

// ── Core API ──────────────────────────────────────────────────────────────────

/**
 * Fetch all drafts.
 * - No filter: returns all (admin)
 * - createdBy set: returns rows where created_by=id OR manager_id=id (manager sees own + assigned)
 *
 * Uses two separate queries and merges to avoid PostgREST .or() edge cases.
 */
export async function getDrafts(createdBy?: string): Promise<Draft[]> {
  if (!createdBy) {
    // Admin: fetch all
    const { data, error } = await supabase
      .from('logitrans_drafts')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) {
      console.error('[draftsApi] getDrafts error:', error.message);
      return [];
    }
    return (data || []).map(rowToDraft);
  }

  // Manager: fetch own drafts (created_by = id)
  const [ownResult, assignedResult] = await Promise.all([
    supabase
      .from('logitrans_drafts')
      .select('*')
      .eq('created_by', createdBy)
      .order('updated_at', { ascending: false }),
    supabase
      .from('logitrans_drafts')
      .select('*')
      .eq('manager_id', createdBy)
      .order('updated_at', { ascending: false }),
  ]);

  if (ownResult.error) console.error('[draftsApi] getDrafts own error:', ownResult.error.message);
  if (assignedResult.error) console.error('[draftsApi] getDrafts assigned error:', assignedResult.error.message);

  const ownRows = ownResult.data || [];
  const assignedRows = assignedResult.data || [];

  // Merge, deduplicate by id, sort by updated_at desc
  const seen = new Set<string>();
  const merged: any[] = [];
  for (const row of [...ownRows, ...assignedRows]) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      merged.push(row);
    }
  }
  merged.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  console.log(`[draftsApi] getDrafts for ${createdBy}: own=${ownRows.length}, assigned=${assignedRows.length}, merged=${merged.length}`);
  return merged.map(rowToDraft);
}

/** Assign a draft to a specific manager (admin action) */
export async function assignDraftToManager(draftId: string, managerId: string | null): Promise<void> {
  const { error } = await supabase
    .from('logitrans_drafts')
    .update({ manager_id: managerId, updated_at: new Date().toISOString() })
    .eq('id', draftId);
  if (error) {
    console.error('[draftsApi] assignDraftToManager error:', error.message);
    throw error;
  }
}

/** Upsert a draft */
export async function saveDraft(draft: Draft): Promise<void> {
  const row = draftToRow(draft);
  const { error } = await supabase
    .from('logitrans_drafts')
    .upsert(row, { onConflict: 'id' });
  if (error) {
    console.error('[draftsApi] saveDraft error:', error.message);
    throw error;
  }
}

/** Delete a draft by id */
export async function deleteDraft(id: string): Promise<void> {
  const { error } = await supabase
    .from('logitrans_drafts')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('[draftsApi] deleteDraft error:', error.message);
  }
}

/** Update draft status and optional PDF URL */
export async function updateDraftStatus(
  id: string,
  status: 'draft' | 'pending' | 'signed',
  pdfUrl?: string
): Promise<void> {
  const now = new Date().toISOString();
  const updates: any = { status, updated_at: now };
  if (pdfUrl) updates.pdf_url = pdfUrl;
  if (status === 'signed') updates.signed_at = now;
  const { error } = await supabase
    .from('logitrans_drafts')
    .update(updates)
    .eq('id', id);
  if (error) {
    console.error('[draftsApi] updateDraftStatus error:', error.message);
  }
}

/**
 * Auto-delete expired drafts (status='draft', older than 20 days).
 * Should be called on archive page load.
 */
export async function cleanupExpiredDrafts(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DRAFT_EXPIRE_DAYS);
  const { data, error } = await supabase
    .from('logitrans_drafts')
    .delete()
    .eq('status', 'draft')
    .lt('created_at', cutoff.toISOString())
    .select('id');
  if (error) {
    console.error('[draftsApi] cleanupExpiredDrafts error:', error.message);
    return 0;
  }
  const count = data?.length || 0;
  if (count > 0) console.log(`[draftsApi] Auto-deleted ${count} expired drafts (>20 days)`); 
  return count;
}

/** Add a supplementary agreement (Доп1, Доп2, ...) to a draft */
export async function addSupplementaryAgreement(
  draftId: string,
  agreement: SupplementaryAgreement
): Promise<void> {
  const { data, error } = await supabase
    .from('logitrans_drafts')
    .select('supplementary_agreements')
    .eq('id', draftId)
    .single();
  if (error) {
    console.error('[draftsApi] addSupplementaryAgreement fetch error:', error.message);
    throw error;
  }
  const current: SupplementaryAgreement[] = data?.supplementary_agreements || [];
  const updated = [...current, agreement];
  const { error: updateError } = await supabase
    .from('logitrans_drafts')
    .update({ supplementary_agreements: updated, updated_at: new Date().toISOString() })
    .eq('id', draftId);
  if (updateError) {
    console.error('[draftsApi] addSupplementaryAgreement update error:', updateError.message);
    throw updateError;
  }
}

/** Remove a supplementary agreement by index */
export async function removeSupplementaryAgreement(
  draftId: string,
  index: number
): Promise<void> {
  const { data, error } = await supabase
    .from('logitrans_drafts')
    .select('supplementary_agreements')
    .eq('id', draftId)
    .single();
  if (error) throw error;
  const current: SupplementaryAgreement[] = data?.supplementary_agreements || [];
  const updated = current.filter((_, i) => i !== index);
  const { error: updateError } = await supabase
    .from('logitrans_drafts')
    .update({ supplementary_agreements: updated, updated_at: new Date().toISOString() })
    .eq('id', draftId);
  if (updateError) throw updateError;
}

// ── Migration ─────────────────────────────────────────────────────────────────

/** One-time migration: move existing localStorage drafts to Supabase */
export async function migrateLocalDrafts(): Promise<void> {
  const LS_KEY = 'logitrans_drafts';
  const LS_MIGRATED = 'logitrans_drafts_migrated';

  if (localStorage.getItem(LS_MIGRATED)) return; // already done

  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      localStorage.setItem(LS_MIGRATED, '1');
      return;
    }
    const drafts: Draft[] = JSON.parse(raw);
    if (!Array.isArray(drafts) || drafts.length === 0) {
      localStorage.setItem(LS_MIGRATED, '1');
      return;
    }

    console.log('[draftsApi] Migrating', drafts.length, 'local drafts to Supabase...');
    for (const draft of drafts) {
      await saveDraft(draft);
    }
    localStorage.setItem(LS_MIGRATED, '1');
    console.log('[draftsApi] Migration complete');
  } catch (e: any) {
    console.warn('[draftsApi] Migration failed:', e?.message);
  }
}
