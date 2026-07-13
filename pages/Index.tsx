
import React, { useRef, useState, useEffect, useCallback } from 'react';
import ContractForm from '@/components/features/ContractForm';
import ContractPreview from '@/components/features/ContractPreview';
import ClauseManager from '@/components/features/ClauseManager';
import ExportOptions from '@/components/features/ExportOptions';
import ContractStartScreen from '@/components/features/ContractStartScreen';
import {
  Draft, saveDraft, updateDraftStatus, cleanupExpiredDrafts
} from '@/lib/draftsApi';
import { useContract } from '@/hooks/useContract';
import { useAuth } from '@/hooks/useAuth';
import { saveContractToSheet, ExtraSheet } from '@/lib/sheetsApi';
import { getMissingRequiredFields } from '@/lib/exportUtils';
import { COMPANIES, MANAGERS } from '@/constants/companies';
import { getStoredManagers } from '@/hooks/useAuth';
import { migrateLocalDrafts } from '@/lib/draftsApi';
import { FileText, List, Eye, ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

type ActiveTab = 'form' | 'clauses';
type PageMode = 'start' | 'editor';

const Index: React.FC = () => {
  const { currentUser } = useAuth();
  const contract = useContract(currentUser?.id);
  const previewRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('form');
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form');
  const [pageMode, setPageMode] = useState<PageMode>('start');
  const [leftWidth, setLeftWidth] = useState(380);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const isSavingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadedManagers, setLoadedManagers] = useState<any[]>([]);

  // Reset lock on mount; migrate localStorage drafts to Supabase once; cleanup expired drafts
  useEffect(() => {
    isSavingRef.current = false;
    setIsSaving(false);
    migrateLocalDrafts().catch(e => console.warn('[Index] migration error:', e?.message));
    cleanupExpiredDrafts().catch(e => console.warn('[Index] cleanup error:', e?.message));
  }, []);

  // Load managers async for getManagerName
  useEffect(() => {
    getStoredManagers().then(list => setLoadedManagers(list));
  }, []);

  const formData = contract.getFormData();

  const getManagerName = () => {
    if (!formData.managerId) return '';
    const stored = loadedManagers.find(m => m.id === formData.managerId);
    if (stored) return stored.name;
    return MANAGERS.find(m => m.id === formData.managerId)?.name || formData.managerId;
  };

  // Auto-save draft to Supabase every 30 seconds — only update form_data, keep existing status
  const autoSaveDraft = useCallback(async () => {
    if (pageMode !== 'editor') return;
    const data = contract.getFormData();
    const draftId = currentDraftId || `draft_${Date.now()}`;
    // Only auto-save if draft already exists (don't create new ones on timer)
    if (!currentDraftId) return;
    const draft: Draft = {
      id: draftId,
      contractNumber: data.clientInfo.contractNumber || '',
      clientName: data.clientInfo.companyName || '',
      expeditorId: data.expeditorId,
      updatedAt: new Date().toISOString(),
      createdBy: currentUser?.id,
      managerId: data.managerId || undefined,
      status: 'draft', // auto-save never changes status
      formData: data,
    };
    await saveDraft(draft).catch(e => console.warn('[autoSave] failed:', e?.message));
  }, [pageMode, currentDraftId, currentUser?.id, contract]);

  useEffect(() => {
    if (pageMode !== 'editor') return;
    const timer = setInterval(autoSaveDraft, 30000);
    return () => clearInterval(timer);
  }, [autoSaveDraft, pageMode]);

  const handleManualSaveDraft = async () => {
    // Validate required fields before saving
    const currentData = contract.getFormData();
    const missing = getMissingRequiredFields(currentData);
    if (missing.length > 0) {
      toast.error(
        `Zorunlu alanlar eksik (${missing.length}) — kayıt engellendi`,
        { description: missing.slice(0, 5).join(' • ') + (missing.length > 5 ? ` +${missing.length - 5} daha` : '') }
      );
      return;
    }

    if (isSavingRef.current) {
      console.log('[Save] Already saving, skip');
      return;
    }
    isSavingRef.current = true;
    setIsSaving(true);
    console.log('[Save] Starting save...');

    // Safety timeout: always release lock after 15s
    const safetyTimer = setTimeout(() => {
      setIsSaving(false);
      console.log('[Save] Safety timeout released');
    }, 15000);

    try {
      // Collect current form data directly
      const currentData = contract.getFormData();
      console.log('[Save] Got form data, expeditorId:', currentData.expeditorId);

      // Lock contract number (uses already-committed number from new contract init)
      const saved = await contract.saveToLocalAsync();
      const lockedNumber = saved.formData.clientInfo.contractNumber || '';
      console.log('[Save] Contract number locked:', lockedNumber);

      // Save draft to Supabase with status 'pending' (İmza Bekliyor)
      const draftId = currentDraftId || `draft_${Date.now()}`;
      const draft: Draft = {
        id: draftId,
        contractNumber: lockedNumber,
        clientName: currentData.clientInfo.companyName || '',
        expeditorId: currentData.expeditorId,
        updatedAt: new Date().toISOString(),
        createdBy: currentUser?.id,
        managerId: currentData.managerId || undefined,
        status: 'pending',  // Сохранить → İmza Bekliyor
        formData: saved.formData,
      };
      setCurrentDraftId(draftId);
      await saveDraft(draft);
      console.log('[Save] Draft saved to Supabase with status=pending');

      // Send to Google Sheets
      console.log('[Save] Sending to Sheets...');
      const sheetRow = {
        contractNumber: lockedNumber,
        contractDate: currentData.clientInfo.contractDate || '',
        manager: getManagerName(),
        expeditor: COMPANIES.find(c => c.id === currentData.expeditorId)?.nameRu || currentData.expeditorId,
        clientName: currentData.clientInfo.companyName || '',
        sector: currentData.clientInfo.sector || '',
        country: currentData.clientInfo.country || '',
        city: currentData.clientInfo.city || '',
        address: currentData.clientInfo.address || '',
        director: currentData.clientInfo.director || '',
        email: currentData.clientInfo.email || '',
        mobilePhone: currentData.clientInfo.mobilePhone || '',
        officePhone: currentData.clientInfo.officePhone || '',
        bin: currentData.clientInfo.bin || '',
        currency: currentData.clientInfo.currency || 'USD',
        contractAmount: currentData.clientInfo.contractAmount || '',
        account: currentData.clientInfo.account || '',
        bankName: currentData.clientInfo.bankName || '',
        swift: currentData.clientInfo.swift || '',
        status: 'İmza Bekliyor',
      };
      // Find extra sheets: use selected manager in form (admin may save on behalf of another manager)
      const effectiveManagerId = currentData.managerId || currentUser?.id;
      const currentMgr = loadedManagers.find(m => m.id === effectiveManagerId);
      const extraSheets: ExtraSheet[] = (currentMgr as any)?.extra_sheets || [];
      console.log('[Save] Sheet row contractNumber:', sheetRow.contractNumber);
      console.log('[Save] Extra sheets count:', extraSheets.length);
      await saveContractToSheet(sheetRow, extraSheets);
      console.log('[Save] Sheets save SUCCESS');
      toast.success('Sözleşme kaydedildi — İmza Bekleyenler listesine taşındı');
    } catch (err: any) {
      console.error('[Save] Error:', err.message);
      toast.error(`Ошибка: ${err.message}`);
    } finally {
      clearTimeout(safetyTimer);
      isSavingRef.current = false;
      setIsSaving(false);
      console.log('[Save] Done');
    }
  };

  const handleLoadDraft = (draft: Draft) => {
    contract.loadContract({
      id: '',
      contractNumber: draft.contractNumber,
      clientName: draft.clientName,
      expeditorId: draft.expeditorId,
      createdAt: draft.updatedAt,
      status: draft.status || 'draft',
      formData: draft.formData,
    });
    setCurrentDraftId(draft.id);
    setPageMode('editor');
  };

  const handleNewContract = async () => {
    setCurrentDraftId(null);
    contract.resetForNewContract();
    setPageMode('editor');
    // Immediately reserve a contract number and create a draft record
    // Small delay to allow resetForNewContract to propagate expeditorId
    setTimeout(async () => {
      try {
        const { generateContractNumber: genNum } = await import('@/lib/contractNumber');
        const data = contract.getFormData();
        const expeditor = data.expeditorId || 'logitrans_uz';
        const reservedNumber = await genNum(expeditor);
        // Set the number in the contract form
        contract.handleClientChange('contractNumber', reservedNumber);
        // Create a draft record immediately with status 'draft'
        const newDraftId = `draft_${Date.now()}`;
        const now = new Date().toISOString();
        const newDraft: Draft = {
          id: newDraftId,
          contractNumber: reservedNumber,
          clientName: '',
          expeditorId: expeditor,
          updatedAt: now,
          createdAt: now,
          createdBy: currentUser?.id,
          status: 'draft',
          formData: contract.getFormData(),
        };
        await saveDraft(newDraft);
        setCurrentDraftId(newDraftId);
        console.log('[handleNewContract] Reserved number:', reservedNumber, 'draftId:', newDraftId);
      } catch (e: any) {
        console.warn('[handleNewContract] Failed to reserve number:', e?.message);
      }
    }, 100);
  };

  // Check for pending load from archive page
  useEffect(() => {
    const pending = localStorage.getItem('logitrans_pending_load');
    if (pending) {
      try {
        const draft = JSON.parse(pending);
        localStorage.removeItem('logitrans_pending_load');
        handleLoadDraft(draft);
      } catch (e) {
        localStorage.removeItem('logitrans_pending_load');
      }
    }
    // The original comment to disable eslint for exhaustive-deps is acceptable,
    // as it explicitly states the intent for this specific useEffect call.
    // However, if the error message was about a _syntax_ error, this comment itself
    // is not the syntax error. The provided error message "Definition for rule 'react-hooks/exhaustive-deps' was not found"
    // is not a syntax error in the code, but an ESLint configuration error.
    // Since the task is to fix syntax errors, and this line doesn't have a syntax error,
    // the code remains unchanged. If ESLint was actually failing due to missing rule definition,
    // the fix would be in ESLint config, not the TSX file.
  }, []);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ev.clientX - rect.left;
      if (newWidth >= 260 && newWidth <= 620) setLeftWidth(newWidth);
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleBackToStart = () => {
    autoSaveDraft();
    setPageMode('start');
  };

  /** Called when PDF is uploaded and contract is marked as signed */
  const handleContractSigned = async (pdfUrl: string) => {
    try {
      // Ensure draft is saved first (create if not exists)
      const data = contract.getFormData();
      const draftId = currentDraftId || `draft_${Date.now()}`;
      if (!currentDraftId) {
        const draft: Draft = {
          id: draftId,
          contractNumber: data.clientInfo.contractNumber || '',
          clientName: data.clientInfo.companyName || '',
          expeditorId: data.expeditorId,
          updatedAt: new Date().toISOString(),
          createdBy: currentUser?.id,
          managerId: data.managerId || undefined,
          status: 'draft',
          formData: data,
        };
        await saveDraft(draft);
        setCurrentDraftId(draftId);
      }
      await updateDraftStatus(draftId, 'signed', pdfUrl);
      console.log('[handleContractSigned] Draft status updated to signed, draftId:', draftId);
    } catch (err: any) {
      console.error('[handleContractSigned] Error updating status:', err.message);
    }
  };

  if (pageMode === 'start') {
    return (
      <div style={{ height: 'calc(100vh - 45px)', overflow: 'auto' }}>
        <ContractStartScreen onNew={handleNewContract} onLoadDraft={handleLoadDraft} />
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 45px)' }} ref={containerRef}>
      {/* Top toolbar */}
      <div className="no-print flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b"
        style={{ borderColor: 'hsl(215 22% 22%)', background: 'hsl(215 28% 14%)' }}
      >
        <button
          onClick={handleBackToStart}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all hover:bg-white/10 flex-shrink-0"
          style={{ color: 'hsl(215 15% 60%)' }}
        >
          <ArrowLeft size={13} /> <span className="hidden sm:inline">Назад</span>
        </button>

        <div className="flex-1 overflow-x-auto">
          <ExportOptions
            data={formData}
            onSave={contract.saveToLocal}
            onToggleStamp={contract.setIncludeStamp}
            onToggleSignature={contract.setIncludeSignature}
            onStampScaleChange={contract.setStampScale}
            onSignatureScaleChange={contract.setSignatureScale}
            previewRef={previewRef}
            onContractSigned={handleContractSigned}
            managerName={getManagerName()}
            onManualSave={handleManualSaveDraft}
            extraSheets={(loadedManagers.find(m => m.id === (formData.managerId || currentUser?.id)) as any)?.extra_sheets || []}
            currentDraftId={currentDraftId}
            currentUserId={currentUser?.id}
          />
        </div>

        <button
          onClick={handleManualSaveDraft}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all flex-shrink-0"
          style={{
            background: isSaving ? 'hsl(38 92% 40%)' : 'hsl(38 92% 50%)',
            color: 'hsl(215 28% 12%)',
            opacity: isSaving ? 0.7 : 1,
            minWidth: '70px',
          }}
          title="Сохранить черновик"
        >
          {isSaving
            ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block flex-shrink-0" />
            : <Save size={13} />}
          <span className="hidden sm:inline ml-1">{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
        </button>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Desktop */}
        <div
          className="hidden lg:flex flex-col no-print"
          style={{ width: `${leftWidth}px`, flexShrink: 0 }}
        >
          <div className="flex border-b flex-shrink-0" style={{ borderColor: 'hsl(215 22% 22%)', background: 'hsl(215 28% 14%)' }}>
            {([
              { key: 'form', label: 'Форма / Form', icon: FileText },
              { key: 'clauses', label: 'Пункты / Clauses', icon: List },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all"
                style={{
                  background: activeTab === t.key ? 'hsl(215 28% 17%)' : 'transparent',
                  color: activeTab === t.key ? 'hsl(38 92% 50%)' : 'hsl(215 15% 55%)',
                  borderBottom: activeTab === t.key ? '2px solid hsl(38 92% 50%)' : '2px solid transparent',
                }}
              >
                <t.icon size={13} /> {t.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {activeTab === 'form' ? (
              <ContractForm
                expeditorId={contract.expeditorId}
                managerId={contract.managerId}
                clientInfo={contract.clientInfo}
                availableManagers={contract.availableManagers}
                languages={contract.languages}
                onExpeditorChange={contract.handleExpeditorChange}
                onManagerChange={contract.setManagerId}
                onClientChange={contract.handleClientChange}
                onLanguagesChange={contract.setLanguages}
              />
            ) : (
              <ClauseManager
                clauses={contract.clauses}
                onToggle={contract.toggleClause}
                onUpdateContent={contract.updateClauseContent}
                onAddClause={contract.addCustomClause}
                onRemove={contract.removeClause}
              />
            )}
          </div>
        </div>

        {/* Resizer */}
        <div
          onMouseDown={handleResizeStart}
          className="hidden lg:flex flex-col items-center justify-center no-print cursor-col-resize select-none group"
          style={{ width: '10px', flexShrink: 0, background: 'hsl(215 22% 20%)', borderLeft: '1px solid hsl(215 22% 26%)', borderRight: '1px solid hsl(215 22% 26%)' }}
          title="Sürükleyerek yeniden boyutlandırın"
        >
          <div className="flex flex-col gap-0.5 opacity-30 group-hover:opacity-80 transition-opacity">
            {[0,1,2].map(i => (
              <div key={i} className="w-0.5 h-4 rounded-full" style={{ background: 'hsl(215 15% 65%)' }} />
            ))}
          </div>
        </div>

        {/* Right Panel - Contract Preview */}
        <div className="hidden lg:flex flex-1 overflow-hidden" style={{ background: '#e8eaec' }}>
          <div className="flex-1 overflow-y-auto p-4">
            <ContractPreview data={formData} previewRef={previewRef} />
          </div>
        </div>

        {/* Mobile View */}
        <div className="flex flex-col flex-1 lg:hidden overflow-hidden">
          <div className="flex border-b no-print flex-shrink-0" style={{ borderColor: 'hsl(215 22% 22%)', background: 'hsl(215 28% 14%)' }}>
            <button
              onClick={() => setMobileView('form')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium"
              style={{
                color: mobileView === 'form' ? 'hsl(38 92% 50%)' : 'hsl(215 15% 55%)',
                borderBottom: mobileView === 'form' ? '2px solid hsl(38 92% 50%)' : '2px solid transparent',
                background: mobileView === 'form' ? 'hsl(215 28% 17%)' : 'transparent',
              }}
            >
              <FileText size={13} /> Форма
            </button>
            <button
              onClick={() => setMobileView('preview')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium"
              style={{
                color: mobileView === 'preview' ? 'hsl(38 92% 50%)' : 'hsl(215 15% 55%)',
                borderBottom: mobileView === 'preview' ? '2px solid hsl(38 92% 50%)' : '2px solid transparent',
                background: mobileView === 'preview' ? 'hsl(215 28% 17%)' : 'transparent',
              }}
            >
              <Eye size={13} /> Договор
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {mobileView === 'form' ? (
              <div className="h-full overflow-hidden flex flex-col">
                <div className="flex flex-shrink-0" style={{ background: 'hsl(215 28% 15%)', borderBottom: '1px solid hsl(215 22% 22%)' }}>
                  <button onClick={() => setActiveTab('form')} className="flex-1 py-2 text-xs font-medium" style={{ color: activeTab === 'form' ? 'hsl(38 92% 50%)' : 'hsl(215 15% 50%)' }}>Клиент</button>
                  <button onClick={() => setActiveTab('clauses')} className="flex-1 py-2 text-xs font-medium" style={{ color: activeTab === 'clauses' ? 'hsl(38 92% 50%)' : 'hsl(215 15% 50%)' }}>Пункты</button>
                </div>
                <div className="flex-1 overflow-hidden">
                  {activeTab === 'form' ? (
                    <ContractForm
                      expeditorId={contract.expeditorId}
                      managerId={contract.managerId}
                      clientInfo={contract.clientInfo}
                      availableManagers={contract.availableManagers}
                      languages={contract.languages}
                      onExpeditorChange={contract.handleExpeditorChange}
                      onManagerChange={contract.setManagerId}
                      onClientChange={contract.handleClientChange}
                      onLanguagesChange={contract.setLanguages}
                    />
                  ) : (
                    <ClauseManager
                      clauses={contract.clauses}
                      onToggle={contract.toggleClause}
                      onUpdateContent={contract.updateClauseContent}
                      onAddClause={contract.addCustomClause}
                      onRemove={contract.removeClause}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3" style={{ background: '#e8eaec' }}>
                <ContractPreview data={formData} previewRef={previewRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
