import React, { useState } from 'react';
import { ContractFormData } from '@/types/contract';
import { downloadAsWord } from '@/lib/exportUtils';
import { uploadContractPdf, saveContractToSheet, ExtraSheet } from '@/lib/sheetsApi';
import { saveDraft } from '@/lib/draftsApi';
import { createClient } from '@supabase/supabase-js';
import { COMPANIES } from '@/constants/companies';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
import {
  Download, Stamp, PenLine, Printer, Upload, Loader2, CheckCircle2, ZoomIn, ZoomOut
} from 'lucide-react';
import { toast } from 'sonner';

interface ExportOptionsProps {
  data: ContractFormData;
  onSave: () => void;
  onToggleStamp: (v: boolean) => void;
  onToggleSignature: (v: boolean) => void;
  onStampScaleChange?: (v: number) => void;
  onSignatureScaleChange?: (v: number) => void;
  previewRef: React.RefObject<HTMLDivElement>;
  managerName?: string;
  /** Called when PDF is finalized and uploaded → status = signed */
  onContractSigned?: (pdfUrl: string) => void;
  /** Called to trigger full save (local + sheets) from toolbar */
  onManualSave?: () => void;
  /** Manager's extra sheets array */
  extraSheets?: ExtraSheet[];
  /** Current draft ID for status update */
  currentDraftId?: string | null;
  /** Current user ID */
  currentUserId?: string;
}

const ExportOptions: React.FC<ExportOptionsProps> = ({
  data,
  onSave,
  onToggleStamp,
  onToggleSignature,
  onStampScaleChange,
  onSignatureScaleChange,
  previewRef,
  managerName = '',
  onContractSigned,
  onManualSave,
  extraSheets = [],
  currentDraftId,
  currentUserId,
}) => {
  const [uploading, setUploading] = useState(false);
  const [signed, setSigned] = useState(false);
  const [showSizePanel, setShowSizePanel] = useState(false);

  const stampScale = data.stampScale ?? 1.0;
  const signatureScale = data.signatureScale ?? 1.0;

  const getExpeditorName = () => {
    return COMPANIES.find(c => c.id === data.expeditorId)?.nameRu || data.expeditorId;
  };

  const handleDownloadHTML = async () => {
    await downloadAsWord(data);
    toast.success('Sözleşme Word formatında indirildi (.doc)');
  };

  /** Print / PDF — generates clean contract HTML and opens print dialog in a new window */
  const handlePrint = async () => {
    const { generateContractHTML } = await import('@/lib/exportUtils');
    const html = await generateContractHTML(data);
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast.error('Pop-up engellendi — tarayıcı ayarlarında pop-up izni verin');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  /**
   * "PDF Upload" flow:
   * 1. Show file picker to upload the saved PDF
   * 2. Upload to Supabase Storage
   * 3. Save row in Google Sheets with pdfLink + status İmzalandı
   */
  const handleSendFinalPdf = async () => {
    if (!data.clientInfo.contractNumber) {
      toast.warning('Укажите номер договора');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploading(true);
      try {
        const pdfUrl = await uploadContractPdf(
          file,
          data.clientInfo.contractNumber,
          data.clientInfo.contractDate,
          data.clientInfo.companyName,
        );

        await saveContractToSheet(
          {
            contractNumber: data.clientInfo.contractNumber,
            contractDate: data.clientInfo.contractDate,
            manager: managerName,
            expeditor: getExpeditorName(),
            clientName: data.clientInfo.companyName,
            sector: data.clientInfo.sector,
            country: data.clientInfo.country,
            city: data.clientInfo.city,
            address: data.clientInfo.address,
            director: data.clientInfo.director,
            email: data.clientInfo.email,
            mobilePhone: data.clientInfo.mobilePhone,
            officePhone: data.clientInfo.officePhone,
            bin: data.clientInfo.bin,
            currency: data.clientInfo.currency,
            contractAmount: data.clientInfo.contractAmount,
            account: data.clientInfo.account,
            bankName: data.clientInfo.bankName,
            swift: data.clientInfo.swift,
            status: 'Подписан ✓',
            pdfLink: pdfUrl,
          },
          extraSheets,
        );

        // Update draft status directly in Supabase
        const now = new Date().toISOString();
        if (currentDraftId) {
          // Update existing draft
          const { error: updateError } = await supabase
            .from('logitrans_drafts')
            .update({ status: 'signed', pdf_url: pdfUrl, signed_at: now, updated_at: now })
            .eq('id', currentDraftId);
          if (updateError) console.error('[ExportOptions] updateDraftStatus error:', updateError.message);
          else console.log('[ExportOptions] Draft marked as signed, id:', currentDraftId);
        } else {
          // No draft exists yet — create one as signed
          const newDraftId = `draft_${Date.now()}`;
          const { error: insertError } = await supabase
            .from('logitrans_drafts')
            .upsert({
              id: newDraftId,
              contract_number: data.clientInfo.contractNumber,
              client_name: data.clientInfo.companyName,
              expeditor_id: data.expeditorId,
              created_by: currentUserId || null,
              updated_at: now,
              created_at: now,
              signed_at: now,
              status: 'signed',
              pdf_url: pdfUrl,
              form_data: data,
            }, { onConflict: 'id' });
          if (insertError) console.error('[ExportOptions] insertDraft error:', insertError.message);
          else console.log('[ExportOptions] New signed draft created, id:', newDraftId);
        }

        setSigned(true);
        onContractSigned?.(pdfUrl);
        toast.success('PDF загружен — sözleşme imzalandı olarak işaretlendi');
      } catch (err: any) {
        console.error('Send final PDF error:', err);
        toast.error('Ошибка при загрузке', { description: err.message });
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Stamp & Signature toggles */}
      <label className="flex items-center gap-1.5 cursor-pointer text-xs" style={{ color: 'hsl(210 20% 75%)' }}>
        <input
          type="checkbox"
          checked={data.includeStamp}
          onChange={e => onToggleStamp(e.target.checked)}
          className="w-3.5 h-3.5 rounded accent-amber-400"
        />
        <Stamp size={12} />
        <span className="hidden sm:inline">Печать</span>
      </label>
      <label className="flex items-center gap-1.5 cursor-pointer text-xs" style={{ color: 'hsl(210 20% 75%)' }}>
        <input
          type="checkbox"
          checked={data.includeSignature}
          onChange={e => onToggleSignature(e.target.checked)}
          className="w-3.5 h-3.5 rounded accent-amber-400"
        />
        <PenLine size={12} />
        <span className="hidden sm:inline">Подпись</span>
      </label>

      {/* Size adjustment panel toggle */}
      {(data.includeStamp || data.includeSignature) && (
        <div className="relative">
          <button
            onClick={() => setShowSizePanel(v => !v)}
            className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium"
            style={{ background: showSizePanel ? 'hsl(215 25% 30%)' : 'hsl(215 25% 22%)', color: 'hsl(210 20% 75%)' }}
            title="Boyut ayarla"
          >
            <ZoomIn size={11} />
            <span className="hidden sm:inline" style={{ fontSize: '10px' }}>Boyut</span>
          </button>
          {showSizePanel && (
            <div className="absolute right-0 top-full mt-1 z-50 rounded-xl p-3 space-y-3" style={{ background: 'hsl(215 28% 20%)', border: '1px solid hsl(215 22% 32%)', minWidth: '200px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
              <p className="text-xs font-semibold" style={{ color: 'hsl(38 92% 55%)' }}>Boyut Ayarları</p>
              {data.includeStamp && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs flex items-center gap-1" style={{ color: 'hsl(215 15% 65%)' }}>
                      <Stamp size={10} /> Mühür
                    </label>
                    <span className="text-xs font-mono" style={{ color: 'hsl(38 92% 60%)' }}>{Math.round(stampScale * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ZoomOut size={10} style={{ color: 'hsl(215 15% 50%)', flexShrink: 0 }} />
                    <input type="range" min="0.3" max="3" step="0.05"
                      value={stampScale}
                      onChange={e => onStampScaleChange?.(parseFloat(e.target.value))}
                      className="flex-1 accent-amber-400" style={{ height: '4px' }}
                    />
                    <ZoomIn size={10} style={{ color: 'hsl(215 15% 50%)', flexShrink: 0 }} />
                  </div>
                </div>
              )}
              {data.includeSignature && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs flex items-center gap-1" style={{ color: 'hsl(215 15% 65%)' }}>
                      <PenLine size={10} /> İmza
                    </label>
                    <span className="text-xs font-mono" style={{ color: 'hsl(38 92% 60%)' }}>{Math.round(signatureScale * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ZoomOut size={10} style={{ color: 'hsl(215 15% 50%)', flexShrink: 0 }} />
                    <input type="range" min="0.3" max="3" step="0.05"
                      value={signatureScale}
                      onChange={e => onSignatureScaleChange?.(parseFloat(e.target.value))}
                      className="flex-1 accent-amber-400" style={{ height: '4px' }}
                    />
                    <ZoomIn size={10} style={{ color: 'hsl(215 15% 50%)', flexShrink: 0 }} />
                  </div>
                </div>
              )}
              <div className="flex gap-1.5 pt-1">
                <button onClick={() => { onStampScaleChange?.(1.0); onSignatureScaleChange?.(1.0); }}
                  className="flex-1 py-1 rounded text-xs" style={{ background: 'hsl(215 25% 26%)', color: 'hsl(215 15% 60%)' }}>Sıfırla</button>
                <button onClick={() => setShowSizePanel(false)}
                  className="flex-1 py-1 rounded text-xs" style={{ background: 'hsl(38 92% 50%)', color: 'hsl(215 28% 12%)' }}>Kapat</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="w-px h-5 mx-1" style={{ background: 'hsl(215 22% 30%)' }} />

      <button
        onClick={handleDownloadHTML}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all"
        style={{ background: 'hsl(142 60% 28%)', color: 'white' }}
      >
        <Download size={12} />
        <span className="hidden sm:inline">Word</span>
      </button>

      <button
        onClick={handlePrint}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all"
        style={{ background: 'hsl(270 50% 35%)', color: 'white' }}
      >
        <Printer size={12} />
        <span className="hidden sm:inline">PDF / Print</span>
      </button>

      {/* Final PDF Upload → Sheets */}
      <button
        onClick={handleSendFinalPdf}
        disabled={uploading || signed}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all disabled:opacity-60"
        style={{
          background: signed ? 'hsl(142 60% 28%)' : 'hsl(38 92% 50%)',
          color: signed ? 'white' : 'hsl(215 28% 12%)',
        }}
      >
        {uploading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : signed ? (
          <CheckCircle2 size={12} />
        ) : (
          <Upload size={12} />
        )}
        <span className="hidden sm:inline">
          {uploading ? 'Загрузка...' : signed ? 'Подписан' : 'PDF Yükle & Kaydet'}
        </span>
      </button>
    </div>
  );
};

export default ExportOptions;
