import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { COMPANIES } from '@/constants/companies';
import {
  getStoredManagers, saveManager, deleteManager, updateManager, StoredManager, ExtraSheet
} from '@/hooks/useAuth';
import { Loader2 as SpinnerIcon } from 'lucide-react';
import {
  getCompanyAssets, saveCompanyAssets, fileToDataUrl, CompanyAssets
} from '@/lib/companyAssets';
import {
  Users, Building2, Upload, Trash2, Plus, X, Check,
  Shield, ImageIcon, Stamp, PenLine, ChevronDown, ChevronUp, Edit2, Lock, Eye, EyeOff,
  Database, RefreshCw, FileArchive, HardDrive, Share2, FileText, Pin, PinOff,
  FlaskConical, RotateCcw, AlertTriangle, TrendingUp, UserCheck, Save, Layers, GripVertical,
  Star, StarOff, Globe, Truck, ZoomIn
} from 'lucide-react';
import { getDrafts, Draft, saveDraft, deleteDraft, assignDraftToManager } from '@/lib/draftsApi';
import { deleteContractFromSheet, saveContractToSheet, getMainSheets, addMainSheet, updateMainSheet, deleteMainSheet, MainSheet } from '@/lib/sheetsApi';
import {
  setCounterValue, resetAllCounters, getCompanyPrefix, formatNumber
} from '@/lib/contractNumber';
import { getMasterTemplateFull, saveMasterTemplate, restoreTemplateVersion, TemplateVersion } from '@/lib/templateApi';
import { generateFlatClauses } from '@/constants/clauses';
import { FlatClauseItem } from '@/types/contract';
import {
  getForwarders, createForwarder, updateForwarder, deleteForwarder, setDefaultForwarder, Forwarder,
  uploadForwarderAsset, removeForwarderAsset, DEFAULT_POSITION_CONFIG, PositionConfig
} from '@/lib/forwardersApi';
import { toast } from 'sonner';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const MANUAL_RATES_KEY = 'logitrans_manual_rates';

interface StorageStats {
  pdfFiles: number;
  pdfBytes: number;
  assetFiles: number;
  assetBytes: number;
  totalFiles: number;
  totalBytes: number;
  lastUpdated: Date | null;
}

// Supabase free tier storage limit: 1 GB
const STORAGE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024;

type AdminTab = 'managers' | 'forwarders' | 'assets' | 'storage' | 'contracts' | 'template';

const EMPTY_FORWARDER: Omit<Forwarder, 'createdAt' | 'updatedAt'> = {
  id: '',
  isActive: true,
  isDefault: false,
  sortOrder: 99,
  companyNameRu: '',
  companyNameEn: '',
  companyNameTr: '',
  shortNameRu: '',
  shortNameEn: '',
  shortNameTr: '',
  directorNameRu: '',
  directorNameEn: '',
  directorNameTr: '',
  details11_1Ru: '',
  details11_1En: '',
  details11_1Tr: '',
  city: '',
  cityRu: '',
  stampScale: 1.0,
  signatureScale: 1.0,
};

const AdminPanel: React.FC = () => {
  const [tab, setTab] = useState<AdminTab>('managers');
  const [managers, setManagers] = useState<StoredManager[]>([]);
  const [assets, setAssets] = useState<Record<string, CompanyAssets>>({});
  const [addingMgr, setAddingMgr] = useState(false);
  const [newMgr, setNewMgr] = useState({ name: '', email: '', companyId: 'logitrans_uz', password: '', extra_sheets: [] as ExtraSheet[], drive_folder_id: '' });
  const [showNewPass, setShowNewPass] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<StoredManager>>({});
  const [showEditPass, setShowEditPass] = useState(false);
  const [expandedCompany, setExpandedCompany] = useState<string | null>('logitrans_uz');
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [allDrafts, setAllDrafts] = useState<Draft[]>([]);
  const [sharingDraftId, setSharingDraftId] = useState<string | null>(null);
  const [shareTargetId, setShareTargetId] = useState<string>('');
  const [deletingContractId, setDeletingContractId] = useState<string | null>(null);
  const [testingSheetId, setTestingSheetId] = useState<string | null>(null);
  const [resettingCounters, setResettingCounters] = useState(false);
  const [deletingTestData, setDeletingTestData] = useState(false);
  const [confirmCleanup, setConfirmCleanup] = useState(false);
  const [counterInputs, setCounterInputs] = useState<Record<string, string>>({});
  const [savingCounter, setSavingCounter] = useState<string | null>(null);
  // Main Sheets state
  const [mainSheets, setMainSheets] = useState<MainSheet[]>([]);
  const [loadingMainSheets, setLoadingMainSheets] = useState(false);
  const [addingMainSheet, setAddingMainSheet] = useState(false);
  const [newMainSheet, setNewMainSheet] = useState({ spreadsheet_id: '', sheet_name: '', label: '', is_active: true });
  const [savingMainSheet, setSavingMainSheet] = useState(false);
  const [editingMainSheetId, setEditingMainSheetId] = useState<string | null>(null);
  const [editMainSheetData, setEditMainSheetData] = useState<Partial<MainSheet>>({});
  const [testingMainSheetId, setTestingMainSheetId] = useState<string | null>(null);
  const [deletingMainSheetId, setDeletingMainSheetId] = useState<string | null>(null);
  const [deletingPdfFiles, setDeletingPdfFiles] = useState(false);
  const [confirmDeletePdfs, setConfirmDeletePdfs] = useState(false);

  const [manualRates, setManualRates] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(MANUAL_RATES_KEY) || '{}'); } catch { return {}; }
  });
  const [savingRates, setSavingRates] = useState(false);
  const [liveRates, setLiveRates] = useState<Record<string, number | null>>({});
  const [fetchingLiveRates, setFetchingLiveRates] = useState(false);
  const [assigningDraftId, setAssigningDraftId] = useState<string | null>(null);
  const [assignTargetId, setAssignTargetId] = useState<string>('');
  const [updatingContractStatusId, setUpdatingContractStatusId] = useState<string | null>(null);
  const [contractStatusFilter, setContractStatusFilter] = useState<string>('all');
  // Google Drive / Sheets integration
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [savingServiceAccount, setSavingServiceAccount] = useState(false);
  const [loadingServiceAccount, setLoadingServiceAccount] = useState(false);
  const [currentServiceEmail, setCurrentServiceEmail] = useState('');
  const [testingDrive, setTestingDrive] = useState(false);
  const [driveTestResult, setDriveTestResult] = useState<'success' | 'error' | null>(null);
  // OAuth2 state
  const [oauthClientId, setOauthClientId] = useState('');
  const [oauthClientSecret, setOauthClientSecret] = useState('');
  const [oauthConnectedEmail, setOauthConnectedEmail] = useState('');
  const [savingOAuthCreds, setSavingOAuthCreds] = useState(false);
  const [connectingOAuth, setConnectingOAuth] = useState(false);
  const [disconnectingOAuth, setDisconnectingOAuth] = useState(false);
  const [showOAuthSecret, setShowOAuthSecret] = useState(false);
  const [showSaPanel, setShowSaPanel] = useState(false);

  // Template state
  const [templateClauses, setTemplateClauses] = useState<FlatClauseItem[]>([]);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [expandedClauseId, setExpandedClauseId] = useState<string | null>(null);
  const [templateUpdatedAt, setTemplateUpdatedAt] = useState<string | null>(null);
  const [templateVersions, setTemplateVersions] = useState<TemplateVersion[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDeleteClauseId, setConfirmDeleteClauseId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Forwarders state
  const [forwarders, setForwarders] = useState<Forwarder[]>([]);
  const [loadingForwarders, setLoadingForwarders] = useState(false);
  const [addingForwarder, setAddingForwarder] = useState(false);
  const [newForwarder, setNewForwarder] = useState<Omit<Forwarder, 'createdAt' | 'updatedAt'>>({ ...EMPTY_FORWARDER });
  const [savingNewForwarder, setSavingNewForwarder] = useState(false);
  const [editingForwarderId, setEditingForwarderId] = useState<string | null>(null);
  const [editForwarderData, setEditForwarderData] = useState<Partial<Forwarder>>({});
  const [savingForwarder, setSavingForwarder] = useState<string | null>(null);
  const [deletingForwarderId, setDeletingForwarderId] = useState<string | null>(null);
  const [confirmDeleteForwarderId, setConfirmDeleteForwarderId] = useState<string | null>(null);
  const [fwdExpandedId, setFwdExpandedId] = useState<string | null>(null);
  const [fwdActiveTab, setFwdActiveTab] = useState<'basic' | 'details'>('basic');
  // Live preview scales — updated on slider drag, persisted to DB on mouseup
  const [previewScales, setPreviewScales] = useState<Record<string, { stamp: number; sig: number }>>({})
  // Position config editor state
  const [posEditId, setPosEditId] = useState<string | null>(null);
  const [posEditConfig, setPosEditConfig] = useState<PositionConfig>(DEFAULT_POSITION_CONFIG);
  const [posEditLang, setPosEditLang] = useState<'1' | '2' | '3'>('1');
  const [savingPosConfig, setSavingPosConfig] = useState(false);;

  const stampRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const sigRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const dragSourceIdx = useRef<number>(-1);
  const saJsonFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    getStoredManagers().then(list => setManagers(list));
    const assetMap: Record<string, CompanyAssets> = {};
    COMPANIES.forEach(c => {
      assetMap[c.id] = getCompanyAssets(c.id);
    });
    setAssets(assetMap);
  }, []);

  const loadAllDrafts = async () => {
    const drafts = await getDrafts();
    setAllDrafts(drafts);
  };

  const loadStorageStats = async () => {
    setLoadingStats(true);
    try {
      // Recursive helper: list all actual files under a bucket prefix
      const listAllFilesWithSize = async (bucket: string, prefix = ''): Promise<{ path: string; size: number }[]> => {
        const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } });
        if (error || !data) return [];
        const results: { path: string; size: number }[] = [];
        for (const item of data) {
          if (item.name === '.emptyFolderPlaceholder') continue;
          const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
          const isFolder = item.id === null || item.id === undefined || (!item.metadata?.size && !item.metadata?.mimetype);
          if (isFolder) {
            const sub = await listAllFilesWithSize(bucket, fullPath);
            results.push(...sub);
          } else {
            results.push({ path: fullPath, size: item.metadata?.size ?? 0 });
          }
        }
        return results;
      };

      // For contract-pdfs: also explicitly check known subfolders to ensure nothing is missed
      const listContractPdfsWithSize = async (): Promise<{ path: string; size: number }[]> => {
        const rootFiles = await listAllFilesWithSize('contract-pdfs', '');
        // Explicitly also check known deep subfolders (musteri-anlasmalar, dopsogl)
        const knownSubfolders = ['musteri-anlasmalar', 'dopsogl'];
        const extra: { path: string; size: number }[] = [];
        for (const folder of knownSubfolders) {
          const { data } = await supabase.storage.from('contract-pdfs').list(folder, { limit: 1000 });
          if (data) {
            for (const item of data) {
              if (item.name === '.emptyFolderPlaceholder') continue;
              const fullPath = `${folder}/${item.name}`;
              const isFolder2 = item.id === null || item.id === undefined || (!item.metadata?.size && !item.metadata?.mimetype);
              if (isFolder2) {
                const sub = await listAllFilesWithSize('contract-pdfs', fullPath);
                extra.push(...sub);
              } else {
                extra.push({ path: fullPath, size: item.metadata?.size ?? 0 });
              }
            }
          }
        }
        // Merge and deduplicate by path
        const pathMap = new Map<string, number>();
        for (const f of [...rootFiles, ...extra]) pathMap.set(f.path, f.size);
        return Array.from(pathMap.entries()).map(([path, size]) => ({ path, size }));
      };

      // Fetch contract-pdfs (all subfolders) and company-assets in parallel
      const [pdfFilesArr, assetFilesArr] = await Promise.all([
        listContractPdfsWithSize(),
        listAllFilesWithSize('company-assets', ''),
      ]);

      const pdfFiles = pdfFilesArr.length;
      const pdfBytes = pdfFilesArr.reduce((s, f) => s + f.size, 0);
      const assetFiles = assetFilesArr.length;
      const assetBytes = assetFilesArr.reduce((s, f) => s + f.size, 0);

      console.log('[loadStorageStats] PDFs:', pdfFiles, 'paths:', pdfFilesArr.map(f => f.path));
      console.log('[loadStorageStats] Assets:', assetFiles);

      setStorageStats({
        pdfFiles,
        pdfBytes,
        assetFiles,
        assetBytes,
        totalFiles: pdfFiles + assetFiles,
        totalBytes: pdfBytes + assetBytes,
        lastUpdated: new Date(),
      });
    } catch (err: any) {
      toast.error('Depolama istatistikleri yüklenemedi: ' + err.message);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchLiveRates = async () => {
    setFetchingLiveRates(true);
    try {
      const resp = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!resp.ok) throw new Error('API yanıt vermedi');
      const json = await resp.json();
      setLiveRates({
        UZS: json.rates?.UZS ?? null,
        KZT: json.rates?.KZT ?? null,
        RUB: json.rates?.RUB ?? null,
      });
    } catch (e: any) {
      toast.error('Güncel kur alınamadı: ' + e.message);
    } finally {
      setFetchingLiveRates(false);
    }
  };

  const loadForwarders = async () => {
    setLoadingForwarders(true);
    try {
      const list = await getForwarders();
      setForwarders(list);
    } catch (e: any) {
      toast.error('Ekspeditörler yüklenemedi: ' + e.message);
    } finally {
      setLoadingForwarders(false);
    }
  };

  const loadMainSheets = async () => {
    setLoadingMainSheets(true);
    try {
      const list = await getMainSheets();
      setMainSheets(list);
    } catch (e: any) {
      toast.error('Ana tablolar yüklenemedi: ' + e.message);
    } finally {
      setLoadingMainSheets(false);
    }
  };

  const handleAddMainSheet = async () => {
    if (!newMainSheet.spreadsheet_id.trim()) { toast.error('Spreadsheet ID zorunludur'); return; }
    if (!newMainSheet.sheet_name.trim()) { toast.error('Sayfa adı zorunludur'); return; }
    setSavingMainSheet(true);
    try {
      const maxSort = mainSheets.length > 0 ? Math.max(...mainSheets.map(s => s.sort_order)) + 1 : 0;
      await addMainSheet({ ...newMainSheet, sort_order: maxSort });
      await loadMainSheets();
      setNewMainSheet({ spreadsheet_id: '', sheet_name: '', label: '', is_active: true });
      setAddingMainSheet(false);
      toast.success('Ana e-tablo eklendi');
    } catch (e: any) {
      toast.error('Eklenemedi: ' + e.message);
    } finally {
      setSavingMainSheet(false);
    }
  };

  const handleUpdateMainSheet = async (id: string) => {
    setSavingMainSheet(true);
    try {
      await updateMainSheet(id, editMainSheetData);
      await loadMainSheets();
      setEditingMainSheetId(null);
      setEditMainSheetData({});
      toast.success('Ana e-tablo güncellendi');
    } catch (e: any) {
      toast.error('Güncellenemedi: ' + e.message);
    } finally {
      setSavingMainSheet(false);
    }
  };

  const handleDeleteMainSheet = async (id: string) => {
    setDeletingMainSheetId(id);
    try {
      await deleteMainSheet(id);
      setMainSheets(prev => prev.filter(s => s.id !== id));
      toast.success('Ana e-tablo silindi');
    } catch (e: any) {
      toast.error('Silinemedi: ' + e.message);
    } finally {
      setDeletingMainSheetId(null);
    }
  };

  const handleTestMainSheet = async (sheet: MainSheet) => {
    setTestingMainSheetId(sheet.id);
    try {
      const testRow = { contractNumber: 'TEST-00', contractDate: new Date().toLocaleDateString('ru-RU'), manager: 'Admin', expeditor: 'LOGITRANS', clientName: '— Test Satırı / Тест —', sector: '', country: 'TEST', city: 'TEST', address: '', director: 'Test', email: '', mobilePhone: '', officePhone: '', bin: '', currency: 'USD', contractAmount: '0', account: '', bankName: '', swift: '', status: 'Test', pdfLink: '' };
      const { data, error } = await supabase.functions.invoke('sheets-contract', {
        body: { ...testRow, contractDate: new Date().toLocaleDateString('ru-RU'), action: 'append', targetSpreadsheetId: sheet.spreadsheet_id, targetSheetName: sheet.sheet_name },
      });
      if (error) throw new Error(error.message);
      toast.success(`✓ Bağlantı başarılı! "${sheet.sheet_name}" sayfasına test satırı yazıldı.`);
    } catch (e: any) {
      toast.error('✗ Bağlantı hatası: ' + e.message);
    } finally {
      setTestingMainSheetId(null);
    }
  };

  useEffect(() => {
    if (tab === 'storage') { loadStorageStats(); fetchLiveRates(); loadMainSheets(); loadServiceAccountInfo(); }
    if (tab === 'contracts') loadAllDrafts();
    if (tab === 'template') loadTemplate();
    if (tab === 'forwarders') loadForwarders();
    if (tab === 'assets') loadForwarders();
    setConfirmCleanup(false);
  }, [tab]);

  const loadTemplate = async () => {
    setLoadingTemplate(true);
    try {
      const result = await getMasterTemplateFull();
      if (result && result.clauses.length > 0) {
        setTemplateClauses(result.clauses);
        setTemplateUpdatedAt(result.updatedAt);
        setTemplateVersions(result.versions || []);
      } else {
        setTemplateClauses(generateFlatClauses('USD', ''));
        setTemplateUpdatedAt(null);
      }
    } catch (e: any) {
      toast.error('Şablon yüklenemedi: ' + e.message);
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handleSaveTemplate = async () => {
    setSavingTemplate(true);
    try {
      await saveMasterTemplate(templateClauses);
      const now = new Date().toISOString();
      setTemplateUpdatedAt(now);
      setExpandedClauseId(null);
      const updated = await getMasterTemplateFull();
      if (updated) setTemplateVersions(updated.versions || []);
      toast.success('Ana şablon kaydedildi — yeni anlaşmalarda geçerli olacak');
    } catch (e: any) {
      toast.error('Şablon kaydedilemedi: ' + e.message);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleTemplateClauseUpdate = (id: string, field: 'contentRu' | 'contentEn' | 'contentTr', value: string) => {
    setTemplateClauses(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleTemplateClauseToggle = (id: string) => {
    setTemplateClauses(prev => prev.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
  };

  const handleDeleteClause = (id: string) => {
    setTemplateClauses(prev => prev.filter(c => c.id !== id));
    setConfirmDeleteClauseId(null);
    if (expandedClauseId === id) setExpandedClauseId(null);
  };

  const handleDuplicateClause = (id: string) => {
    const src = templateClauses.find(c => c.id === id);
    if (!src) return;
    const maxSort = Math.max(...templateClauses.map(c => c.sortOrder));
    const dup: FlatClauseItem = { ...src, id: `custom_${Date.now()}`, sortOrder: maxSort + 1, itemNumber: `${src.itemNumber}(2)` };
    setTemplateClauses(prev => [...prev, dup]);
  };

  const handleAddClause = (isHeader = false) => {
    const maxSort = Math.max(0, ...templateClauses.map(c => c.sortOrder));
    const newClause: FlatClauseItem = {
      id: `custom_${Date.now()}`,
      itemNumber: `${templateClauses.length + 1}.`,
      contentRu: '',
      contentEn: '',
      contentTr: '',
      isActive: true,
      sortOrder: maxSort + 1,
      isHeader,
    };
    setTemplateClauses(prev => [...prev, newClause]);
    setExpandedClauseId(newClause.id);
  };

  const renumberClauses = (clauses: FlatClauseItem[]): FlatClauseItem[] => {
    let sectionNum = 0;
    let subNum = 0;
    return clauses.map(clause => {
      if (clause.isHeader) {
        sectionNum++;
        subNum = 0;
        return { ...clause, itemNumber: `${sectionNum}.` };
      } else {
        subNum++;
        if (sectionNum === 0) return { ...clause, itemNumber: `${subNum}.` };
        return { ...clause, itemNumber: `${sectionNum}.${subNum}.` };
      }
    });
  };

  const handleDragStart = (e: React.DragEvent, id: string, idx: number) => {
    setDraggingId(id);
    dragSourceIdx.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== draggingId) setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) { setDraggingId(null); setDragOverId(null); return; }
    setTemplateClauses(prev => {
      const srcIdx = prev.findIndex(c => c.id === draggingId);
      const dstIdx = prev.findIndex(c => c.id === targetId);
      if (srcIdx === -1 || dstIdx === -1) return prev;
      const next = [...prev];
      const [removed] = next.splice(srcIdx, 1);
      next.splice(dstIdx, 0, removed);
      const reordered = next.map((c, i) => ({ ...c, sortOrder: i + 1 }));
      return renumberClauses(reordered);
    });
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => { setDraggingId(null); setDragOverId(null); };

  const handleMoveClause = (id: string, direction: 'up' | 'down') => {
    setTemplateClauses(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx === -1) return prev;
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      const reordered = next.map((c, i) => ({ ...c, sortOrder: i + 1 }));
      return renumberClauses(reordered);
    });
  };

  const handleSavePosConfig = async (forwarderId: string) => {
    setSavingPosConfig(true);
    try {
      await updateForwarder(forwarderId, { positionConfig: posEditConfig } as any);
      await loadForwarders();
      setPosEditId(null);
      toast.success('Pozisyon ayarları kaydedildi');
    } catch (e: any) {
      toast.error('Kaydedilemedi: ' + e.message);
    } finally {
      setSavingPosConfig(false);
    }
  };

  const handleSaveManualRates = () => {
    setSavingRates(true);
    try {
      localStorage.setItem(MANUAL_RATES_KEY, JSON.stringify(manualRates));
      toast.success('Döviz kurları kaydedildi — Sözleşme önizlemesinde hemen geçerli olur');
    } catch (e: any) {
      toast.error('Kayıt hatası: ' + e.message);
    } finally {
      setSavingRates(false);
    }
  };

  const handleClearManualRates = () => {
    const cleared = { UZS: '', KZT: '', RUB: '' };
    setManualRates(cleared);
    localStorage.setItem(MANUAL_RATES_KEY, JSON.stringify(cleared));
    toast.success("Manuel kurlar temizlendi — API'den güncel kur alınacak");
  };

  const handleAssignDraft = async (draft: Draft) => {
    if (!assignTargetId) { toast.error('Lütfen bir manager seçin'); return; }
    const targetMgr = managers.find(m => m.id === assignTargetId);
    if (!targetMgr) return;
    try {
      await assignDraftToManager(draft.id, assignTargetId);
      await loadAllDrafts();
      setAssigningDraftId(null);
      setAssignTargetId('');
      toast.success(`${draft.contractNumber || 'Taslak'} → ${targetMgr.name} adına atandı`);
    } catch (e: any) {
      toast.error('Atama hatası: ' + e.message);
    }
  };

  const handleUnassignDraft = async (draft: Draft) => {
    try {
      await assignDraftToManager(draft.id, null);
      await loadAllDrafts();
      toast.success('Manager ataması kaldırıldı');
    } catch (e: any) {
      toast.error('Hata: ' + e.message);
    }
  };

  /** Admin: change contract status + update Google Sheets */
  const handleChangeContractStatus = async (draft: Draft, newStatus: 'draft' | 'pending' | 'signed') => {
    setUpdatingContractStatusId(draft.id);
    try {
      // 1. Update Supabase
      const now = new Date().toISOString();
      const updates: any = { status: newStatus, updated_at: now };
      if (newStatus === 'signed') updates.signed_at = now;
      const { error } = await supabase.from('logitrans_drafts').update(updates).eq('id', draft.id);
      if (error) throw new Error(error.message);

      // 2. Update Google Sheets status column
      const statusLabel = newStatus === 'signed' ? 'Подписан ✓' : newStatus === 'pending' ? 'İmza Bekliyor' : 'Черновик';
      const fd = draft.formData?.clientInfo || {};
      const ownerMgr = managers.find(m => m.id === (draft.createdBy || draft.managerId));
      const sheetRow = {
        contractNumber: draft.contractNumber || '',
        contractDate: fd.contractDate || '',
        manager: ownerMgr?.name || '',
        expeditor: draft.expeditorId || '',
        clientName: draft.clientName || '',
        sector: fd.sector || '',
        country: fd.country || '',
        city: fd.city || '',
        address: fd.address || '',
        director: fd.director || '',
        email: fd.email || '',
        mobilePhone: fd.mobilePhone || '',
        officePhone: fd.officePhone || '',
        bin: fd.bin || '',
        currency: fd.currency || 'USD',
        contractAmount: fd.contractAmount || '',
        account: fd.account || '',
        bankName: fd.bankName || '',
        swift: fd.swift || '',
        status: statusLabel,
        pdfLink: draft.pdfUrl || '',
      };
      const sheetOwnerId = draft.managerId || draft.createdBy;
      let extraSheets: ExtraSheet[] = [];
      if (sheetOwnerId) {
        const { data: mgrRow } = await supabase.from('logitrans_managers').select('extra_sheets').eq('id', sheetOwnerId).maybeSingle();
        if (mgrRow?.extra_sheets) extraSheets = mgrRow.extra_sheets || [];
      }
      await saveContractToSheet(sheetRow, extraSheets).catch(e => console.warn('[Admin] Sheets status update failed (non-fatal):', e?.message));

      // 3. Update local state
      setAllDrafts(prev => prev.map(d => d.id === draft.id ? { ...d, status: newStatus } : d));
      const labels: Record<string, string> = { draft: 'Черновик', pending: 'İmza Bekliyor', signed: 'Подписан' };
      toast.success(`Durum güncellendi → ${labels[newStatus]} (Sheets'e de yansıtıldı)`);
    } catch (err: any) {
      toast.error('Durum güncellenemedi: ' + err.message);
    } finally {
      setUpdatingContractStatusId(null);
    }
  };

  const loadServiceAccountInfo = async () => {
    setLoadingServiceAccount(true);
    try {
      const { data: rows } = await supabase
        .from('logitrans_settings')
        .select('key,value')
        .in('key', ['google_service_account', 'google_oauth_client_id', 'google_oauth_client_secret', 'google_oauth_email']);
      const rowMap: Record<string, string> = {};
      (rows || []).forEach((r: any) => { rowMap[r.key] = r.value || ''; });
      // Service account
      if (rowMap['google_service_account']?.trim()) {
        setServiceAccountJson(rowMap['google_service_account']);
        try { const p = JSON.parse(rowMap['google_service_account']); if (p.client_email) setCurrentServiceEmail(p.client_email); } catch { /* noop */ }
      } else {
        setCurrentServiceEmail('anlasmakayit@gen-lang-client-0465296472.iam.gserviceaccount.com');
      }
      // OAuth2
      setOauthClientId(rowMap['google_oauth_client_id'] || '');
      setOauthClientSecret(rowMap['google_oauth_client_secret'] || '');
      setOauthConnectedEmail(rowMap['google_oauth_email'] || '');
    } catch {
      setCurrentServiceEmail('anlasmakayit@gen-lang-client-0465296472.iam.gserviceaccount.com');
    } finally {
      setLoadingServiceAccount(false);
    }
  };

  const handleSaveOAuthCredentials = async () => {
    if (!oauthClientId.trim()) { toast.error('Client ID boş olamaz'); return; }
    if (!oauthClientSecret.trim()) { toast.error('Client Secret boş olamaz'); return; }
    setSavingOAuthCreds(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from('logitrans_settings').upsert([
        { key: 'google_oauth_client_id', value: oauthClientId.trim(), updated_at: now },
        { key: 'google_oauth_client_secret', value: oauthClientSecret.trim(), updated_at: now },
      ], { onConflict: 'key' });
      if (error) throw new Error(error.message);
      toast.success('OAuth2 kimlik bilgileri kaydedildi — şimdi "Google ile Bağlan" butonuna tıklayın');
    } catch (e: any) {
      toast.error('Kaydedilemedi: ' + e.message);
    } finally {
      setSavingOAuthCreds(false);
    }
  };

  const handleConnectOAuth = () => {
    if (!oauthClientId.trim()) { toast.error('Önce Client ID girin ve kaydedin'); return; }
    setConnectingOAuth(true);
    const state = Math.random().toString(36).slice(2) + Date.now();
    sessionStorage.setItem('oauth_state', state);
    const redirectUri = encodeURIComponent(window.location.origin + '/oauth/callback');
    const scope = encodeURIComponent('https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email');
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${encodeURIComponent(oauthClientId.trim())}` +
      `&redirect_uri=${redirectUri}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${state}`;
    window.location.href = authUrl;
  };

  const handleDisconnectOAuth = async () => {
    setDisconnectingOAuth(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from('logitrans_settings').upsert([
        { key: 'google_oauth_refresh_token', value: '', updated_at: now },
        { key: 'google_oauth_access_token', value: '', updated_at: now },
        { key: 'google_oauth_email', value: '', updated_at: now },
        { key: 'google_oauth_token_expiry', value: '', updated_at: now },
      ], { onConflict: 'key' });
      if (error) throw new Error(error.message);
      setOauthConnectedEmail('');
      setDriveTestResult(null);
      toast.success('Google Drive bağlantısı kesildi');
    } catch (e: any) {
      toast.error('Hata: ' + e.message);
    } finally {
      setDisconnectingOAuth(false);
    }
  };

  const handleSaveServiceAccount = async () => {
    if (!serviceAccountJson.trim()) { toast.error('JSON boş olamaz'); return; }
    let parsed: any;
    try { parsed = JSON.parse(serviceAccountJson); } catch { toast.error('Geçersiz JSON formatı — sözdizimi hatası var'); return; }
    if (!parsed.client_email || !parsed.private_key) { toast.error('JSON eksik alanlar içeriyor (client_email veya private_key bulunamadı)'); return; }
    setSavingServiceAccount(true);
    try {
      const { error } = await supabase.from('logitrans_settings').upsert({ key: 'google_service_account', value: serviceAccountJson, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw new Error(error.message);
      setCurrentServiceEmail(parsed.client_email);
      setDriveTestResult(null);
      toast.success(`✓ Servis hesabı güncellendi: ${parsed.client_email}`);
    } catch (e: any) {
      toast.error('Kaydedilemedi: ' + e.message);
    } finally {
      setSavingServiceAccount(false);
    }
  };

  const handleServiceAccountFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      try {
        const p = JSON.parse(text);
        if (!p.client_email || !p.private_key) { toast.error('Geçersiz service account JSON — gerekli alanlar eksik'); return; }
        setServiceAccountJson(text);
        toast.success(`JSON yüklendi (${p.client_email}) — "Kaydet" ile onaylayın`);
      } catch { toast.error('Geçersiz JSON dosyası'); }
    };
    reader.readAsText(file);
  };

  const handleTestDriveConnection = async () => {
    setTestingDrive(true);
    setDriveTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('sheets-contract', { body: { action: 'test_drive' } });
      if (error) throw new Error(error.message);
      if (data?.success) {
        setDriveTestResult('success');
        toast.success(`✓ Drive bağlantısı başarılı${data.folderName ? ` — Klasör: "${data.folderName}"` : ''}`);
      } else {
        throw new Error(data?.error || 'Drive testi başarısız');
      }
    } catch (e: any) {
      setDriveTestResult('error');
      toast.error('Drive bağlantı hatası: ' + e.message);
    } finally {
      setTestingDrive(false);
    }
  };

  const handleResetCounters = async () => {
    setResettingCounters(true);
    try {
      await resetAllCounters();
      setCounterInputs({});
      toast.success("Tüm sayaçlar sıfırlandı — sonraki anlaşma №1'den başlayacak");
    } catch (err: any) {
      toast.error('Sayaç sıfırlama hatası: ' + err.message);
    } finally {
      setResettingCounters(false);
    }
  };

  const handleSetCounter = async (companyId: string) => {
    const prefix = getCompanyPrefix(companyId);
    const raw = counterInputs[companyId] ?? '';
    const num = parseInt(raw, 10);
    if (!raw.trim() || isNaN(num) || num < 1) {
      toast.error('Geçerli bir sayı girin (minimum 1)');
      return;
    }
    setSavingCounter(companyId);
    try {
      await setCounterValue(prefix, num);
      const year = String(new Date().getFullYear()).slice(-2);
      toast.success(`${prefix} sayacı ayarlandı → sonraki: ${formatNumber(prefix, num)} (${prefix}${String(num).padStart(2,'0')}-${year})`);
    } catch (err: any) {
      toast.error('Sayaç ayarlama hatası: ' + err.message);
    } finally {
      setSavingCounter(null);
    }
  };

  const handleDeleteAllPdfFiles = async () => {
    setDeletingPdfFiles(true);
    try {
      // Recursive helper
      const listAllFiles = async (bucket: string, prefix = ''): Promise<string[]> => {
        const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } });
        if (error || !data) return [];
        const paths: string[] = [];
        for (const item of data) {
          if (item.name === '.emptyFolderPlaceholder') continue;
          const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
          const isFolder = item.id === null || item.id === undefined || (!item.metadata?.size && !item.metadata?.mimetype);
          if (isFolder) {
            const sub = await listAllFiles(bucket, fullPath);
            paths.push(...sub);
          } else {
            paths.push(fullPath);
          }
        }
        return paths;
      };

      // Also check known subfolders explicitly
      const rootPaths = await listAllFiles('contract-pdfs', '');
      const knownSubfolders = ['musteri-anlasmalar', 'dopsogl'];
      const extra: string[] = [];
      for (const folder of knownSubfolders) {
        const { data } = await supabase.storage.from('contract-pdfs').list(folder, { limit: 1000 });
        if (data && data.length > 0) {
          for (const item of data) {
            if (item.name === '.emptyFolderPlaceholder') continue;
            const fullPath = `${folder}/${item.name}`;
            const isFolder = item.id === null || item.id === undefined || (!item.metadata?.size && !item.metadata?.mimetype);
            if (isFolder) {
              const { data: sub } = await supabase.storage.from('contract-pdfs').list(fullPath, { limit: 1000 });
              if (sub) {
                for (const f of sub) {
                  if (f.name !== '.emptyFolderPlaceholder' && f.id !== null) extra.push(`${fullPath}/${f.name}`);
                }
              }
            } else {
              extra.push(fullPath);
            }
          }
        }
      }
      const allPaths = Array.from(new Set([...rootPaths, ...extra]));
      console.log('[DeletePdfs] Paths to delete:', allPaths.length, allPaths);

      let deletedCount = 0;
      let failedCount = 0;
      if (allPaths.length > 0) {
        for (let i = 0; i < allPaths.length; i += 100) {
          const batch = allPaths.slice(i, i + 100);
          const { data: removed, error } = await supabase.storage.from('contract-pdfs').remove(batch);
          if (error) {
            console.error('[DeletePdfs] remove error:', error.message, '| batch:', batch);
            failedCount += batch.length;
          } else {
            deletedCount += (removed?.length ?? batch.length);
            console.log('[DeletePdfs] removed batch:', removed?.length, 'paths:', batch);
          }
        }
      }

      setConfirmDeletePdfs(false);
      if (failedCount > 0) {
        toast.error(`${failedCount} dosya silinemedi — konsolda detay var. Yetki sorunu olabilir.`);
      } else {
        toast.success(`${deletedCount} PDF dosyası silindi`);
      }
      // Reload stats from server to reflect actual state
      await loadStorageStats();
    } catch (err: any) {
      toast.error('Silme hatası: ' + err.message);
    } finally {
      setDeletingPdfFiles(false);
    }
  };

  const handleDeleteAllTestData = async () => {
    setDeletingTestData(true);
    try {
      let fileCount = 0;

      // Helper: list all file paths in a bucket recursively
      // Uses multiple strategies to ensure all files are found including nested folders
      const listAllFiles = async (bucket: string, prefix = ''): Promise<string[]> => {
        const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } });
        if (error || !data) {
          console.warn(`[Delete] list error for ${bucket}/${prefix}:`, error?.message);
          return [];
        }
        const paths: string[] = [];
        for (const item of data) {
          if (item.name === '.emptyFolderPlaceholder') continue;
          const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
          // Detect folders: id is null/undefined OR metadata is null/empty (virtual folder)
          const isFolder = item.id === null || item.id === undefined || (!item.metadata?.size && !item.metadata?.mimetype);
          if (isFolder) {
            // It's a virtual folder — recurse into it
            console.log(`[Delete] Recursing into folder: ${bucket}/${fullPath}`);
            const subPaths = await listAllFiles(bucket, fullPath);
            paths.push(...subPaths);
          } else {
            paths.push(fullPath);
          }
        }
        return paths;
      };

      // Also explicitly list known subfolder patterns in contract-pdfs to be safe
      const listContractPdfsAll = async (): Promise<string[]> => {
        const rootPaths = await listAllFiles('contract-pdfs', '');
        // Explicitly also check known subfolders in case root listing misses them
        const knownSubfolders = ['musteri-anlasmalar', 'dopsogl'];
        const extra: string[] = [];
        for (const folder of knownSubfolders) {
          // Only list if not already covered by root recursion
          const { data } = await supabase.storage.from('contract-pdfs').list(folder, { limit: 1000 });
          if (data && data.length > 0) {
            for (const item of data) {
              if (item.name === '.emptyFolderPlaceholder') continue;
              const fullPath = `${folder}/${item.name}`;
              const isFolder2 = item.id === null || item.id === undefined || (!item.metadata?.size && !item.metadata?.mimetype);
              if (isFolder2) {
                // Sub-subfolder (e.g. dopsogl/{draftId}/)
                const { data: sub } = await supabase.storage.from('contract-pdfs').list(fullPath, { limit: 1000 });
                if (sub) {
                  for (const f of sub) {
                    if (f.name !== '.emptyFolderPlaceholder' && f.id !== null) {
                      extra.push(`${fullPath}/${f.name}`);
                    }
                  }
                }
              } else {
                extra.push(fullPath);
              }
            }
          }
        }
        // Merge and deduplicate
        const allSet = new Set([...rootPaths, ...extra]);
        return Array.from(allSet);
      };

      // 1. Delete ALL files in contract-pdfs bucket (using enhanced multi-strategy listing)
      const pdfPaths = await listContractPdfsAll();
      console.log('[Delete] PDF paths to delete:', pdfPaths.length, pdfPaths);
      if (pdfPaths.length > 0) {
        // Remove in batches of 100 (Supabase limit)
        for (let i = 0; i < pdfPaths.length; i += 100) {
          const batch = pdfPaths.slice(i, i + 100);
          const { error } = await supabase.storage.from('contract-pdfs').remove(batch);
          if (error) console.warn('[Delete] contract-pdfs remove error:', error.message);
        }
        fileCount += pdfPaths.length;
      }

      // 2. Delete ALL files in company-assets bucket
      const assetPaths = await listAllFiles('company-assets');
      console.log('[Delete] Asset paths to delete:', assetPaths.length, assetPaths);
      if (assetPaths.length > 0) {
        for (let i = 0; i < assetPaths.length; i += 100) {
          const batch = assetPaths.slice(i, i + 100);
          const { error } = await supabase.storage.from('company-assets').remove(batch);
          if (error) console.warn('[Delete] company-assets remove error:', error.message);
        }
        fileCount += assetPaths.length;
        // Clear stamp/signature URLs in forwarders table to avoid broken links
        await supabase
          .from('logitrans_forwarders')
          .update({ stamp_url: '', signature_url: '' })
          .neq('id', '__nonexistent__');
        // Reload forwarders to reflect cleared URLs
        await loadForwarders();
      }

      // 3. Delete all draft records from database
      const { data: draftRows, error: draftError } = await supabase
        .from('logitrans_drafts')
        .delete()
        .neq('id', '__nonexistent__')
        .select('id');
      if (draftError) throw draftError;

      // 4. Reset all counters
      await resetAllCounters();

      setAllDrafts([]);
      setConfirmCleanup(false);
      setCounterInputs({});
      toast.success(`Temizlendi: ${draftRows?.length || 0} kayıt + ${fileCount} dosya (tüm bucketlar) + sayaçlar sıfırlandı`);
      // Reload storage stats to reflect 0 files
      await loadStorageStats();
    } catch (err: any) {
      toast.error('Temizleme hatası: ' + err.message);
    } finally {
      setDeletingTestData(false);
    }
  };

  const handleDeleteContract = async (draft: Draft) => {
    setDeletingContractId(draft.id);
    try {
      if (draft.contractNumber) {
        let extraSheets: ExtraSheet[] = [];
        const sheetOwnerId = draft.managerId || draft.createdBy;
        if (sheetOwnerId) {
          const { data: mgrRow } = await supabase
            .from('logitrans_managers')
            .select('extra_sheets')
            .eq('id', sheetOwnerId)
            .maybeSingle();
          if (mgrRow?.extra_sheets) extraSheets = mgrRow.extra_sheets || [];
        }
        await deleteContractFromSheet(draft.contractNumber, extraSheets).catch(e =>
          console.warn('[Admin] Sheets delete failed:', e?.message)
        );
      }
      await deleteDraft(draft.id);
      setAllDrafts(prev => prev.filter(d => d.id !== draft.id));
      toast.success(`Договор ${draft.contractNumber || 'черновик'} удалён`);
    } catch (err: any) {
      toast.error('Ошибка удаления: ' + err.message);
    } finally {
      setDeletingContractId(null);
    }
  };

  const handleDownloadAllCsv = () => {
    if (allDrafts.length === 0) { toast.error('Нет данных для скачивания'); return; }
    const headers = ['№ Договора','Клиент','Отправитель','Статус','Дата','Страна','Город','Адрес','Директор','Email','Телефон','Валюта','Сумма','Менеджер','Atanan Manager','PDF'];
    const rows = allDrafts.map(d => {
      const fd = d.formData?.clientInfo || {};
      const ownerMgr = managers.find(m => m.id === d.createdBy);
      const assignedMgr = managers.find(m => m.id === d.managerId);
      return [
        d.contractNumber||'', d.clientName||'', d.expeditorId||'',
        d.status==='signed'?'Подписан':'Черновик',
        d.updatedAt ? new Date(d.updatedAt).toLocaleDateString('ru-RU') : '',
        fd.country||'', fd.city||'', fd.address||'', fd.director||'',
        fd.email||'', fd.mobilePhone||fd.officePhone||'',
        fd.currency||'', fd.contractAmount||'',
        ownerMgr?.name||d.createdBy||'',
        assignedMgr?.name||'',
        d.pdfUrl||'',
      ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
    });
    const csv = '\uFEFF' + [headers.map(h=>`"${h}"`).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logitrans_anlasmalar_${new Date().toLocaleDateString('ru-RU').replace(/\./g,'-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${allDrafts.length} договор(а) скачано`);
  };

  const handleShareDraft = (draft: Draft) => {
    if (!shareTargetId) { toast.error('Выберите пользователя'); return; }
    const targetMgr = managers.find(m => m.id === shareTargetId);
    if (!targetMgr) return;
    const sharedDraft: Draft = { ...draft, id: `shared_${draft.id}_${shareTargetId}_${Date.now()}`, createdBy: shareTargetId, updatedAt: new Date().toISOString() };
    saveDraft(sharedDraft);
    loadAllDrafts();
    setSharingDraftId(null);
    setShareTargetId('');
    toast.success(`Договор ${draft.contractNumber || 'черновик'} передан → ${targetMgr.name}`);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B','KB','MB','GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleAddManager = async () => {
    if (!newMgr.name.trim()) { toast.error('Введите имя менеджера'); return; }
    const created = await saveManager(newMgr as any);
    const list = await getStoredManagers();
    setManagers(list);
    setNewMgr({ name: '', email: '', companyId: 'logitrans_uz', password: '', extra_sheets: [] });
    setAddingMgr(false);
    toast.success(`Менеджер ${created.name} добавлен`);
  };

  const handleTestExtraSheet = async (mgr: StoredManager, sheet: ExtraSheet) => {
    if (!sheet.spreadsheet_id.trim() || !sheet.sheet_name.trim()) { toast.error('Ek tablo ID veya sayfa adı eksik'); return; }
    setTestingSheetId(mgr.id + '|' + sheet.spreadsheet_id);
    try {
      const testRow = { contractNumber:'TEST-00', contractDate: new Date().toLocaleDateString('ru-RU'), manager: mgr.name, expeditor:'LOGITRANS', clientName:'— Test Satırı / Тест —', sector:'', country:'TEST', city:'TEST', address:'', director:'Test', email: mgr.email||'', mobilePhone:'', officePhone:'', bin:'', currency:'USD', contractAmount:'0', account:'', bankName:'', swift:'', status:'Test', pdfLink:'' };
      await saveContractToSheet(testRow, [sheet]);
      toast.success(`✓ Bağlantı başarılı! "${sheet.sheet_name}" sayfasına test satırı yazıldı.`);
    } catch (err: any) {
      toast.error(`✗ Bağlantı hatası: ${err.message}`);
    } finally {
      setTestingSheetId(null);
    }
  };

  const handleTogglePin = async (mgr: StoredManager) => {
    const newPinned = !mgr.is_pinned;
    await updateManager(mgr.id, { is_pinned: newPinned } as any);
    const list = await getStoredManagers();
    setManagers(list);
    toast.success(newPinned ? `${mgr.name} listeye sabitlendi` : `${mgr.name} listeden kaldırıldı`);
  };

  const handleDelete = async (id: string) => {
    await deleteManager(id);
    const list = await getStoredManagers();
    setManagers(list);
    toast.success('Менеджер удалён');
  };

  const handleEditSave = async (id: string) => {
    await updateManager(id, editData);
    const list = await getStoredManagers();
    setManagers(list);
    setEditingId(null);
    setShowEditPass(false);
    toast.success('Изменения сохранены');
  };

  const handleFileUpload = async (companyId: string, type: 'stamp' | 'signature', file: File) => {
    try {
      await uploadForwarderAsset(companyId, type, file);
      await loadForwarders();
      const { fileToDataUrl: fToUrl, saveCompanyAssets: savCA, getCompanyAssets: getCA } = await import('@/lib/companyAssets');
      const dataUrl = await fToUrl(file);
      const current = getCA(companyId);
      const updated = { ...current, ...(type === 'stamp' ? { stampUrl: dataUrl } : { signatureUrl: dataUrl }) };
      savCA(updated);
      setAssets(prev => ({ ...prev, [companyId]: updated }));
      toast.success(`${type === 'stamp' ? 'Печать' : 'Подпись'} yüklendi ve sunucuya kaydedildi`);
    } catch (e: any) {
      toast.error(`Yükleme hatası: ${e.message}`);
    }
  };

  const handleRemoveAsset = async (companyId: string, type: 'stamp' | 'signature') => {
    try {
      await removeForwarderAsset(companyId, type);
      await loadForwarders();
      const { saveCompanyAssets: savCA, getCompanyAssets: getCA } = await import('@/lib/companyAssets');
      const current = getCA(companyId);
      const updated = { ...current, ...(type === 'stamp' ? { stampUrl: undefined } : { signatureUrl: undefined }) };
      savCA(updated);
      setAssets(prev => ({ ...prev, [companyId]: updated }));
      toast.success('Dosya silindi');
    } catch (e: any) {
      toast.error(`Silme hatası: ${e.message}`);
    }
  };

  // Forwarder handlers
  const handleCreateForwarder = async () => {
    if (!newForwarder.id.trim()) { toast.error('Firma ID giriniz (örn: logitrans_new)'); return; }
    if (!newForwarder.companyNameRu.trim()) { toast.error('Rusça firma adı zorunludur'); return; }
    setSavingNewForwarder(true);
    try {
      await createForwarder(newForwarder);
      await loadForwarders();
      setNewForwarder({ ...EMPTY_FORWARDER });
      setAddingForwarder(false);
      toast.success(`${newForwarder.companyNameRu} eklendi`);
    } catch (e: any) {
      toast.error('Eklenemedi: ' + e.message);
    } finally {
      setSavingNewForwarder(false);
    }
  };

  const handleUpdateForwarder = async (id: string) => {
    setSavingForwarder(id);
    try {
      await updateForwarder(id, editForwarderData);
      await loadForwarders();
      setEditingForwarderId(null);
      setEditForwarderData({});
      toast.success('Ekspeditör güncellendi');
    } catch (e: any) {
      toast.error('Güncellenemedi: ' + e.message);
    } finally {
      setSavingForwarder(null);
    }
  };

  const handleDeleteForwarder = async (id: string) => {
    setDeletingForwarderId(id);
    try {
      await deleteForwarder(id);
      await loadForwarders();
      setConfirmDeleteForwarderId(null);
      toast.success('Ekspeditör silindi');
    } catch (e: any) {
      toast.error('Silinemedi: ' + e.message);
    } finally {
      setDeletingForwarderId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultForwarder(id);
      await loadForwarders();
      toast.success('Varsayılan ekspeditör güncellendi');
    } catch (e: any) {
      toast.error('Hata: ' + e.message);
    }
  };

  const handleToggleForwarderActive = async (fwd: Forwarder) => {
    try {
      await updateForwarder(fwd.id, { isActive: !fwd.isActive });
      await loadForwarders();
      toast.success(fwd.isActive ? 'Pasif yapıldı' : 'Aktif yapıldı');
    } catch (e: any) {
      toast.error('Hata: ' + e.message);
    }
  };

  const FwdField = ({
    label, value, onChange, multiline = false, placeholder = '',
  }: {
    label: string; value: string; onChange: (v: string) => void;
    multiline?: boolean; placeholder?: string;
  }) => (
    <div>
      <label className="form-label-style block mb-1">{label}</label>
      {multiline ? (
        <textarea rows={6} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full rounded-lg p-2 text-xs resize-y outline-none"
          style={{ background: 'hsl(215 28% 13%)', border: '1px solid hsl(215 22% 27%)', color: 'hsl(210 20% 86%)', fontFamily: 'monospace', lineHeight: 1.55 }} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="form-input-style" />
      )}
    </div>
  );

  const renderForwarderForm = (
    data: Partial<Forwarder>,
    onChange: (field: keyof Forwarder, val: string | boolean | number) => void,
    isNew = false,
  ) => {
    const t2 = fwdActiveTab;
    return (
      <div className="space-y-3">
        <div className="flex rounded-lg overflow-hidden" style={{ background: 'hsl(215 28% 14%)', border: '1px solid hsl(215 22% 22%)' }}>
          {(['basic', 'details'] as const).map(t => (
            <button key={t} onClick={() => setFwdActiveTab(t)}
              className="flex-1 py-2 text-xs font-medium transition-all"
              style={{ background: t2 === t ? 'hsl(215 28% 22%)' : 'transparent', color: t2 === t ? 'hsl(38 92% 50%)' : 'hsl(215 15% 55%)', borderBottom: t2 === t ? '2px solid hsl(38 92% 50%)' : '2px solid transparent' }}
            >
              {t === 'basic' ? '📋 Temel Bilgiler' : '📄 11.1 Detay İçerikleri'}
            </button>
          ))}
        </div>
        {t2 === 'basic' && (
          <div className="space-y-4">
            {isNew && <FwdField label="Firma ID (benzersiz, boşluksuz)" value={(data.id as string) || ''} onChange={v => onChange('id', v)} placeholder="logitrans_new" />}
            <div className="p-3 rounded-lg space-y-3" style={{ background: 'hsl(215 28% 14%)', border: '1px solid hsl(215 22% 22%)' }}>
              <p className="text-xs font-semibold" style={{ color: 'hsl(200 60% 65%)' }}>🇷🇺 Rusça</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <FwdField label="Firma adı (tam)" value={(data.companyNameRu as string) || ''} onChange={v => onChange('companyNameRu', v)} placeholder='ИП ООО «LOGITRANS»' />
                <FwdField label="Kısa adı" value={(data.shortNameRu as string) || ''} onChange={v => onChange('shortNameRu', v)} placeholder='LOGITRANS' />
                <FwdField label="Müdür adı" value={(data.directorNameRu as string) || ''} onChange={v => onChange('directorNameRu', v)} placeholder='Осман Демир' />
              </div>
            </div>
            <div className="p-3 rounded-lg space-y-3" style={{ background: 'hsl(215 28% 14%)', border: '1px solid hsl(215 22% 22%)' }}>
              <p className="text-xs font-semibold" style={{ color: 'hsl(120 50% 60%)' }}>🇬🇧 İngilizce</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <FwdField label="Company name" value={(data.companyNameEn as string) || ''} onChange={v => onChange('companyNameEn', v)} placeholder='IP OOO «LOGITRANS»' />
                <FwdField label="Short name" value={(data.shortNameEn as string) || ''} onChange={v => onChange('shortNameEn', v)} placeholder='LOGITRANS' />
                <FwdField label="Director name" value={(data.directorNameEn as string) || ''} onChange={v => onChange('directorNameEn', v)} placeholder='Osman Demir' />
              </div>
            </div>
            <div className="p-3 rounded-lg space-y-3" style={{ background: 'hsl(215 28% 14%)', border: '1px solid hsl(215 22% 22%)' }}>
              <p className="text-xs font-semibold" style={{ color: 'hsl(25 90% 60%)' }}>🇹🇷 Türkçe</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <FwdField label="Firma adı" value={(data.companyNameTr as string) || ''} onChange={v => onChange('companyNameTr', v)} placeholder='IP OOO «LOGITRANS»' />
                <FwdField label="Kısa adı" value={(data.shortNameTr as string) || ''} onChange={v => onChange('shortNameTr', v)} placeholder='LOGITRANS' />
                <FwdField label="Müdür adı" value={(data.directorNameTr as string) || ''} onChange={v => onChange('directorNameTr', v)} placeholder='Osman Demir' />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FwdField label="Sıra" value={String(data.sortOrder ?? 99)} onChange={v => onChange('sortOrder', parseInt(v) || 99)} />
            </div>
            <div className="p-3 rounded-lg space-y-3" style={{ background: 'hsl(215 28% 14%)', border: '1px solid hsl(215 22% 22%)' }}>
              <p className="text-xs font-semibold" style={{ color: 'hsl(215 15% 65%)' }}>🏙️ Şehir (Sözleşme Başlığı)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <FwdField label="Şehir (EN / TR)" value={(data.city as string) || ''} onChange={v => onChange('city', v)} placeholder="Tashkent" />
                <FwdField label="Город (RU)" value={(data.cityRu as string) || ''} onChange={v => onChange('cityRu', v)} placeholder="г. Ташкент" />
              </div>
            </div>
          </div>
        )}
        {t2 === 'details' && (
          <div className="space-y-4">
            <p className="text-xs" style={{ color: 'hsl(215 15% 50%)' }}>Bu alanlar sözleşmedeki <strong style={{ color: 'hsl(38 92% 55%)' }}>11.1. ЭКСПЕДИТОР</strong> bölümünde otomatik gösterilir.</p>
            <div>
              <label className="form-label-style block mb-1">🇷🇺 11.1 Rusça içerik</label>
              <textarea rows={8} value={(data.details11_1Ru as string) || ''} onChange={e => onChange('details11_1Ru', e.target.value)} className="w-full rounded-lg p-2 text-xs resize-y outline-none" style={{ background: 'hsl(215 28% 13%)', border: '1px solid hsl(215 22% 27%)', color: 'hsl(210 20% 86%)', fontFamily: 'monospace', lineHeight: 1.6 }} placeholder={'ИП ООО «LOGITRANS UZBEKISTAN»\nАдрес: ...'} />
            </div>
            <div>
              <label className="form-label-style block mb-1">🇬🇧 11.1 English content</label>
              <textarea rows={8} value={(data.details11_1En as string) || ''} onChange={e => onChange('details11_1En', e.target.value)} className="w-full rounded-lg p-2 text-xs resize-y outline-none" style={{ background: 'hsl(215 28% 13%)', border: '1px solid hsl(215 22% 27%)', color: 'hsl(210 20% 86%)', fontFamily: 'monospace', lineHeight: 1.6 }} placeholder={'IP OOO «LOGITRANS»\nAddress: ...'} />
            </div>
            <div>
              <label className="form-label-style block mb-1">🇹🇷 11.1 Türkçe içerik</label>
              <textarea rows={8} value={(data.details11_1Tr as string) || ''} onChange={e => onChange('details11_1Tr', e.target.value)} className="w-full rounded-lg p-2 text-xs resize-y outline-none" style={{ background: 'hsl(215 28% 13%)', border: '1px solid hsl(215 22% 27%)', color: 'hsl(210 20% 86%)', fontFamily: 'monospace', lineHeight: 1.6 }} placeholder={'IP OOO «LOGITRANS»\nAdres: ...'} />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: 'hsl(215 28% 12%)' }}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: 'hsl(38 92% 50%)' }}>
            <Shield size={20} style={{ color: 'hsl(215 28% 12%)' }} />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: 'hsl(210 20% 92%)' }}>Панель администратора</h1>
            <p className="text-xs" style={{ color: 'hsl(215 15% 50%)' }}>Admin Panel</p>
          </div>
        </div>

        <div className="flex rounded-lg overflow-hidden mb-6 flex-wrap" style={{ background: 'hsl(215 28% 16%)', border: '1px solid hsl(215 22% 24%)' }}>
          {([
            { key: 'managers', label: 'Пользователи', icon: Users },
            { key: 'forwarders', label: 'Ekspeditörler', icon: Truck },
            { key: 'assets', label: 'Печати и подписи', icon: Stamp },
            { key: 'storage', label: 'Depolama', icon: HardDrive },
            { key: 'contracts', label: 'Anlaşmalar', icon: FileText },
            { key: 'template', label: 'Şablon', icon: Layers },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all min-w-[80px]"
              style={{ background: tab === t.key ? 'hsl(215 28% 22%)' : 'transparent', color: tab === t.key ? 'hsl(38 92% 50%)' : 'hsl(215 15% 55%)', borderBottom: tab === t.key ? '2px solid hsl(38 92% 50%)' : '2px solid transparent' }}
            >
              <t.icon size={13} />{t.label}
            </button>
          ))}
        </div>

        {/* ── Forwarders Tab ── */}
        {tab === 'forwarders' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium" style={{ color: 'hsl(210 20% 80%)' }}>{forwarders.length} ekspeditör / ЭКСПЕДИТОР</p>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(215 15% 48%)' }}>Sözleşme formunda seçilebilecek Logitrans firmaları. Pasif olanlar görünmez.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={loadForwarders} disabled={loadingForwarders} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50" style={{ background: 'hsl(215 25% 25%)', color: 'hsl(210 20% 80%)' }}>
                  <RefreshCw size={12} className={loadingForwarders ? 'animate-spin' : ''} /> Yenile
                </button>
                <button onClick={() => { setAddingForwarder(v => !v); setFwdActiveTab('basic'); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'hsl(38 92% 50%)', color: 'hsl(215 28% 12%)' }}>
                  <Plus size={13} /> Yeni Firma Ekle
                </button>
              </div>
            </div>
            {addingForwarder && (
              <div className="rounded-xl p-4 mb-4 space-y-4" style={{ background: 'hsl(215 28% 18%)', border: '1px solid hsl(38 92% 50% / 0.3)' }}>
                <p className="text-xs font-semibold" style={{ color: 'hsl(38 92% 50%)' }}>Yeni Ekspeditör / ЭКСПЕДИТОР Ekle</p>
                {renderForwarderForm(newForwarder, (field, val) => setNewForwarder(p => ({ ...p, [field]: val })), true)}
                <div className="flex gap-2 pt-1">
                  <button onClick={handleCreateForwarder} disabled={savingNewForwarder} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50" style={{ background: 'hsl(142 60% 28%)', color: 'white' }}>
                    {savingNewForwarder ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <Check size={13} />} Kaydet
                  </button>
                  <button onClick={() => setAddingForwarder(false)} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium" style={{ background: 'hsl(215 25% 25%)', color: 'hsl(210 20% 75%)' }}>
                    <X size={13} /> İptal
                  </button>
                </div>
              </div>
            )}
            {loadingForwarders ? (
              <div className="flex items-center justify-center py-16" style={{ color: 'hsl(38 92% 50%)' }}><RefreshCw size={24} className="animate-spin" /></div>
            ) : forwarders.length === 0 ? (
              <div className="text-center py-12 rounded-xl" style={{ background: 'hsl(215 28% 17%)', border: '1px solid hsl(215 22% 24%)' }}>
                <Truck size={32} style={{ color: 'hsl(215 15% 38%)', margin: '0 auto 12px' }} />
                <p className="text-sm" style={{ color: 'hsl(215 15% 50%)' }}>Ekspeditör bulunamadı</p>
              </div>
            ) : (
              <div className="space-y-2">
                {forwarders.map(fwd => {
                  const isEditing = editingForwarderId === fwd.id;
                  const isConfirmingDelete = confirmDeleteForwarderId === fwd.id;
                  return (
                    <div key={fwd.id} className="rounded-xl overflow-hidden" style={{ background: isEditing ? 'hsl(215 28% 20%)' : 'hsl(215 28% 17%)', border: `1px solid ${isEditing ? 'hsl(38 92% 50% / 0.4)' : isConfirmingDelete ? 'hsl(0 60% 40% / 0.5)' : 'hsl(215 22% 25%)'}`, opacity: fwd.isActive ? 1 : 0.55 }}>
                      {isConfirmingDelete && (
                        <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'hsl(0 50% 16%)', borderBottom: '1px solid hsl(0 55% 28%)' }}>
                          <AlertTriangle size={13} style={{ color: 'hsl(0 80% 65%)', flexShrink: 0 }} />
                          <p className="text-xs flex-1" style={{ color: 'hsl(0 70% 72%)' }}><strong>{fwd.companyNameRu}</strong> silinecek. Emin misiniz?</p>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => handleDeleteForwarder(fwd.id)} disabled={deletingForwarderId === fwd.id} className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium disabled:opacity-50" style={{ background: 'hsl(0 65% 38%)', color: 'white' }}>
                              {deletingForwarderId === fwd.id ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <Trash2 size={10} />} Evet, sil
                            </button>
                            <button onClick={() => setConfirmDeleteForwarderId(null)} className="p-1 rounded" style={{ background: 'hsl(215 25% 28%)', color: 'hsl(210 20% 70%)' }}><X size={11} /></button>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0" style={{ background: fwd.isDefault ? 'hsl(38 92% 50% / 0.2)' : 'hsl(215 25% 24%)' }}>
                          <Truck size={16} style={{ color: fwd.isDefault ? 'hsl(38 92% 50%)' : 'hsl(215 15% 55%)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate" style={{ color: 'hsl(210 20% 90%)' }}>{fwd.companyNameRu}</p>
                            {fwd.isDefault && <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded" style={{ background: 'hsl(38 92% 50% / 0.18)', color: 'hsl(38 92% 60%)' }}><Star size={9} /> Varsayılan</span>}
                            {!fwd.isActive && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'hsl(215 25% 24%)', color: 'hsl(215 15% 50%)' }}>Pasif</span>}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'hsl(215 15% 50%)' }}>{fwd.directorNameRu} · {fwd.companyNameEn}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!fwd.isDefault && (
                            <button onClick={() => handleSetDefault(fwd.id)} className="p-1.5 rounded hover:bg-white/10" style={{ color: 'hsl(215 15% 45%)' }} title="Varsayılan yap"><StarOff size={14} /></button>
                          )}
                          <button onClick={() => handleToggleForwarderActive(fwd)} className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: fwd.isActive ? 'hsl(142 60% 25% / 0.4)' : 'hsl(215 25% 25%)', color: fwd.isActive ? 'hsl(142 60% 60%)' : 'hsl(215 15% 45%)', fontSize: '10px' }}>
                            {fwd.isActive ? 'Aktif' : 'Pasif'}
                          </button>
                          <button onClick={() => { if (isEditing) { setEditingForwarderId(null); setEditForwarderData({}); } else { setEditingForwarderId(fwd.id); setEditForwarderData({ ...fwd }); setFwdActiveTab('basic'); } }} className="p-1.5 rounded hover:bg-white/10" style={{ color: isEditing ? 'hsl(38 92% 55%)' : 'hsl(215 15% 55%)' }} title="Düzenle"><Edit2 size={14} /></button>
                          <button onClick={() => setConfirmDeleteForwarderId(isConfirmingDelete ? null : fwd.id)} className="p-1.5 rounded hover:bg-red-900/30" style={{ color: isConfirmingDelete ? 'hsl(0 70% 65%)' : 'hsl(215 15% 50%)' }} title="Sil"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      {isEditing && (
                        <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid hsl(215 22% 24%)' }}>
                          <div className="pt-3">{renderForwarderForm(editForwarderData, (field, val) => setEditForwarderData(p => ({ ...p, [field]: val })), false)}</div>
                          <div className="flex gap-2">
                            <button onClick={() => handleUpdateForwarder(fwd.id)} disabled={savingForwarder === fwd.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50" style={{ background: 'hsl(142 60% 28%)', color: 'white' }}>
                              {savingForwarder === fwd.id ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <Check size={13} />} Kaydet
                            </button>
                            <button onClick={() => { setEditingForwarderId(null); setEditForwarderData({}); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium" style={{ background: 'hsl(215 25% 25%)', color: 'hsl(210 20% 75%)' }}><X size={13} /> İptal</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Managers Tab ── */}
        {tab === 'managers' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium" style={{ color: 'hsl(210 20% 80%)' }}>{managers.length} пользователей</p>
              <button onClick={() => setAddingMgr(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'hsl(38 92% 50%)', color: 'hsl(215 28% 12%)' }}>
                <Plus size={13} />Добавить
              </button>
            </div>
            {addingMgr && (
              <div className="rounded-xl p-4 mb-4 space-y-3" style={{ background: 'hsl(215 28% 18%)', border: '1px solid hsl(38 92% 50% / 0.3)' }}>
                <p className="text-xs font-semibold" style={{ color: 'hsl(38 92% 50%)' }}>Новый пользователь</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="form-label-style block mb-1">Имя *</label><input className="form-input-style" value={newMgr.name} onChange={e => setNewMgr(p => ({ ...p, name: e.target.value }))} placeholder="Введите имя" /></div>
                  <div><label className="form-label-style block mb-1">Email</label><input className="form-input-style" type="email" value={newMgr.email} onChange={e => setNewMgr(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" /></div>
                  <div>
                    <label className="form-label-style block mb-1 flex items-center gap-1"><Lock size={10} /> Пароль (необязательно)</label>
                    <div className="relative">
                      <input className="form-input-style pr-9" type={showNewPass ? 'text' : 'password'} value={newMgr.password} onChange={e => setNewMgr(p => ({ ...p, password: e.target.value }))} placeholder="Оставьте пустым для входа без пароля" />
                      <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'hsl(215 15% 50%)' }} onClick={() => setShowNewPass(v => !v)}>{showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                    </div>
                  </div>
                  <div>
                    <label className="form-label-style block mb-1">Компания</label>
                    <select className="form-select-style" value={newMgr.companyId} onChange={e => setNewMgr(p => ({ ...p, companyId: e.target.value }))}>
                      {COMPANIES.map(c => <option key={c.id} value={c.id}>{c.nameRu}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label-style block mb-1 flex items-center gap-1.5"><Database size={10} style={{ color: 'hsl(142 60% 55%)' }} /> Google Drive Klasör ID (İsteğe Bağlı)</label>
                    <input className="form-input-style" value={newMgr.drive_folder_id} onChange={e => setNewMgr(p => ({ ...p, drive_folder_id: e.target.value }))} placeholder="17-Ta1mJkkAJmVC9q67_Pmba5x4pPUVin" />
                    <p className="text-xs mt-1" style={{ color: 'hsl(215 15% 45%)' }}>Bu manager'ın PDF'leri belirtilen Google Drive klasörüne de kopyalanır</p>
                  </div>
                </div>
                <div className="rounded-lg p-3 space-y-2" style={{ background: 'hsl(215 25% 22%)', border: '1px solid hsl(215 22% 30%)' }}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'hsl(200 70% 65%)' }}><Database size={11} /> Ek Tablolar (İsteğe Bağlı)</p>
                    <button type="button" onClick={() => setNewMgr(p => ({ ...p, extra_sheets: [...p.extra_sheets, { spreadsheet_id: '', sheet_name: '' }] }))} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium" style={{ background: 'hsl(200 60% 28%)', color: 'hsl(200 80% 80%)' }}><Plus size={10} /> Tablo Ekle</button>
                  </div>
                  {newMgr.extra_sheets.length === 0 && <p className="text-xs" style={{ color: 'hsl(215 15% 45%)', fontStyle: 'italic' }}>Henüz ek tablo eklenmedi</p>}
                  {newMgr.extra_sheets.map((sheet, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div><label className="form-label-style block mb-1">Spreadsheet ID</label><input className="form-input-style" value={sheet.spreadsheet_id} onChange={e => setNewMgr(p => { const s = [...p.extra_sheets]; s[idx] = { ...s[idx], spreadsheet_id: e.target.value }; return { ...p, extra_sheets: s }; })} placeholder="1dn67vEuYHZuI..." /></div>
                        <div><label className="form-label-style block mb-1">Sheet Name</label><input className="form-input-style" value={sheet.sheet_name} onChange={e => setNewMgr(p => { const s = [...p.extra_sheets]; s[idx] = { ...s[idx], sheet_name: e.target.value }; return { ...p, extra_sheets: s }; })} placeholder="Клиенты" /></div>
                      </div>
                      <button type="button" onClick={() => setNewMgr(p => ({ ...p, extra_sheets: p.extra_sheets.filter((_, i) => i !== idx) }))} className="p-1.5 rounded mt-5 flex-shrink-0" style={{ background: 'hsl(0 50% 28%)', color: 'hsl(0 80% 70%)' }}><X size={12} /></button>
                    </div>
                  ))}
                </div>
                <div className="p-2.5 rounded-lg text-xs" style={{ background: 'hsl(215 25% 22%)', color: 'hsl(215 15% 55%)' }}>Если пароль не задан, пользователь входит одним кликом. Если задан — требуется ввод пароля.</div>
                <div className="flex gap-2 pt-1">
                  <button onClick={handleAddManager} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium" style={{ background: 'hsl(142 60% 28%)', color: 'white' }}><Check size={13} /> Сохранить</button>
                  <button onClick={() => setAddingMgr(false)} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium" style={{ background: 'hsl(215 25% 25%)', color: 'hsl(210 20% 75%)' }}><X size={13} /> Отмена</button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {managers.length === 0 ? (
                <div className="text-center py-10 rounded-xl" style={{ background: 'hsl(215 28% 16%)', border: '1px solid hsl(215 22% 24%)' }}>
                  <Users size={32} style={{ color: 'hsl(215 15% 35%)', margin: '0 auto 12px' }} />
                  <p className="text-sm" style={{ color: 'hsl(215 15% 50%)' }}>Нет пользователей</p>
                </div>
              ) : managers.map(mgr => {
                const company = COMPANIES.find(c => c.id === mgr.companyId);
                const isEditing = editingId === mgr.id;
                const hasPassword = mgr.password && mgr.password.trim() !== '';
                return (
                  <div key={mgr.id} className="rounded-xl p-4" style={{ background: isEditing ? 'hsl(215 28% 20%)' : 'hsl(215 28% 17%)', border: `1px solid ${isEditing ? 'hsl(38 92% 50% / 0.4)' : 'hsl(215 22% 25%)'}` }}>
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div><label className="form-label-style block mb-1">Имя</label><input className="form-input-style" value={editData.name ?? mgr.name} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} /></div>
                          <div><label className="form-label-style block mb-1">Email</label><input className="form-input-style" type="email" value={editData.email ?? mgr.email} onChange={e => setEditData(p => ({ ...p, email: e.target.value }))} /></div>
                          <div>
                            <label className="form-label-style block mb-1 flex items-center gap-1"><Lock size={10} /> Пароль</label>
                            <div className="relative">
                              <input className="form-input-style pr-9" type={showEditPass ? 'text' : 'password'} value={editData.password ?? mgr.password ?? ''} onChange={e => setEditData(p => ({ ...p, password: e.target.value }))} placeholder="Оставьте пустым для входа без пароля" />
                              <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'hsl(215 15% 50%)' }} onClick={() => setShowEditPass(v => !v)}>{showEditPass ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                            </div>
                          </div>
                          <div>
                            <label className="form-label-style block mb-1">Компания</label>
                            <select className="form-select-style" value={editData.companyId ?? mgr.companyId} onChange={e => setEditData(p => ({ ...p, companyId: e.target.value }))}>
                              {COMPANIES.map(c => <option key={c.id} value={c.id}>{c.nameRu}</option>)}
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="form-label-style block mb-1 flex items-center gap-1.5"><Database size={10} style={{ color: 'hsl(142 60% 55%)' }} /> Google Drive Klasör ID (İsteğe Bağlı)</label>
                            <input className="form-input-style" value={(editData as any).drive_folder_id ?? (mgr as any).drive_folder_id ?? ''} onChange={e => setEditData(p => ({ ...p, drive_folder_id: e.target.value } as any))} placeholder="17-Ta1mJkkAJmVC9q67_Pmba5x4pPUVin" />
                            <p className="text-xs mt-1" style={{ color: 'hsl(215 15% 45%)' }}>PDF'ler bu Google Drive klasörüne de kopyalanır</p>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className="rounded-lg p-3 space-y-2" style={{ background: 'hsl(215 25% 22%)', border: '1px solid hsl(215 22% 30%)' }}>
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'hsl(200 70% 65%)' }}><Database size={11} /> Ek Tablolar</p>
                              <button type="button" onClick={() => setEditData(p => ({ ...p, extra_sheets: [...((p as any).extra_sheets || (mgr as any).extra_sheets || []), { spreadsheet_id: '', sheet_name: '' }] }))} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium" style={{ background: 'hsl(200 60% 28%)', color: 'hsl(200 80% 80%)' }}><Plus size={10} /> Tablo Ekle</button>
                            </div>
                            {(((editData as any).extra_sheets ?? (mgr as any).extra_sheets) || []).length === 0 && <p className="text-xs" style={{ color: 'hsl(215 15% 45%)', fontStyle: 'italic' }}>Henüz ek tablo eklenmedi</p>}
                            {(((editData as any).extra_sheets ?? (mgr as any).extra_sheets) || []).map((sheet: ExtraSheet, idx: number) => (
                              <div key={idx} className="flex gap-2 items-start">
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div><label className="form-label-style block mb-1">Spreadsheet ID</label><input className="form-input-style" value={sheet.spreadsheet_id} onChange={e => { const base: ExtraSheet[] = (editData as any).extra_sheets ?? [...((mgr as any).extra_sheets || [])]; const s = [...base]; s[idx] = { ...s[idx], spreadsheet_id: e.target.value }; setEditData(p => ({ ...p, extra_sheets: s } as any)); }} placeholder="1dn67vEuYHZuI..." /></div>
                                  <div><label className="form-label-style block mb-1">Sheet Name</label><input className="form-input-style" value={sheet.sheet_name} onChange={e => { const base: ExtraSheet[] = (editData as any).extra_sheets ?? [...((mgr as any).extra_sheets || [])]; const s = [...base]; s[idx] = { ...s[idx], sheet_name: e.target.value }; setEditData(p => ({ ...p, extra_sheets: s } as any)); }} placeholder="Клиенты" /></div>
                                </div>
                                <button type="button" onClick={() => { const base: ExtraSheet[] = (editData as any).extra_sheets ?? [...((mgr as any).extra_sheets || [])]; setEditData(p => ({ ...p, extra_sheets: base.filter((_, i) => i !== idx) } as any)); }} className="p-1.5 rounded mt-5 flex-shrink-0" style={{ background: 'hsl(0 50% 28%)', color: 'hsl(0 80% 70%)' }}><X size={12} /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditSave(mgr.id)} className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium" style={{ background: 'hsl(142 60% 28%)', color: 'white' }}><Check size={12} /> Сохранить</button>
                          <button onClick={() => { setEditingId(null); setShowEditPass(false); }} className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium" style={{ background: 'hsl(215 25% 28%)', color: 'hsl(210 20% 75%)' }}><X size={12} /> Отмена</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0" style={{ background: 'hsl(220 70% 28%)' }}>
                          <Users size={16} style={{ color: 'hsl(210 80% 80%)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium" style={{ color: 'hsl(210 20% 90%)' }}>{mgr.name}</p>
                            {mgr.is_pinned && <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded" style={{ background: 'hsl(38 92% 50% / 0.18)', color: 'hsl(38 92% 60%)' }}><Pin size={9} /> Temsilci listesinde</span>}
                            {hasPassword && <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded" style={{ background: 'hsl(215 25% 28%)', color: 'hsl(215 15% 60%)' }}><Lock size={9} /> şifreli</span>}
                            {(((mgr as any).extra_sheets) || []).length > 0 && <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded" style={{ background: 'hsl(200 60% 25% / 0.4)', color: 'hsl(200 70% 65%)' }}><Database size={9} /> {((mgr as any).extra_sheets || []).length} ek tablo</span>}
                          </div>
                          <p className="text-xs" style={{ color: 'hsl(215 15% 50%)' }}>{company?.nameRu} {mgr.email && `· ${mgr.email}`}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {((mgr as any).extra_sheets || []).map((sheet: ExtraSheet, si: number) => (
                            <button key={si} onClick={() => handleTestExtraSheet(mgr, sheet)} disabled={testingSheetId === mgr.id + '|' + sheet.spreadsheet_id} className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all disabled:opacity-50" style={{ background: 'hsl(200 60% 25% / 0.5)', color: 'hsl(200 80% 70%)' }} title={`"${sheet.sheet_name}" sayfasını test et`}>
                              {testingSheetId === mgr.id + '|' + sheet.spreadsheet_id ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <FlaskConical size={12} />}
                              <span className="hidden sm:inline">{sheet.sheet_name || 'Test'}</span>
                            </button>
                          ))}
                          <button onClick={() => handleTogglePin(mgr)} className="p-1.5 rounded transition-all hover:bg-white/10" style={{ color: mgr.is_pinned ? 'hsl(38 92% 50%)' : 'hsl(215 15% 45%)' }} title={mgr.is_pinned ? 'Listeden kaldır' : 'Temsilci listesine sabitle'}>
                            {mgr.is_pinned ? <Pin size={14} /> : <PinOff size={14} />}
                          </button>
                          <button onClick={() => { setEditingId(mgr.id); setEditData({}); setShowEditPass(false); }} className="p-1.5 rounded transition-all hover:bg-white/10" style={{ color: 'hsl(215 15% 55%)' }}><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete(mgr.id)} className="p-1.5 rounded transition-all hover:bg-red-900/30" style={{ color: 'hsl(215 15% 55%)' }}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Template Tab ── */}
        {tab === 'template' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-medium" style={{ color: 'hsl(210 20% 80%)' }}>Ana Anlaşma Şablonu</p>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(215 15% 48%)' }}>Burada yapılan değişiklikler tüm yeni anlaşmalarda varsayılan olarak açılır.</p>
              </div>
              <div className="flex items-center gap-2">
                {templateUpdatedAt && (
                  <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'hsl(142 50% 20% / 0.5)', color: 'hsl(142 70% 60%)', border: '1px solid hsl(142 50% 30% / 0.4)' }}>
                    <Check size={10} /> {new Date(templateUpdatedAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {templateVersions.length > 0 && <button onClick={() => setShowVersionHistory(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: showVersionHistory ? 'hsl(220 60% 30%)' : 'hsl(215 25% 25%)', color: showVersionHistory ? 'hsl(220 80% 85%)' : 'hsl(210 20% 80%)' }}><RotateCcw size={12} /> Geçmiş ({templateVersions.length})</button>}
                <button onClick={() => setConfirmReset(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: confirmReset ? 'hsl(0 55% 30%)' : 'hsl(215 25% 25%)', color: confirmReset ? 'hsl(0 80% 75%)' : 'hsl(210 20% 80%)' }}><RotateCcw size={12} /> Sıfırla</button>
                <button onClick={loadTemplate} disabled={loadingTemplate} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50" style={{ background: 'hsl(215 25% 25%)', color: 'hsl(210 20% 80%)' }}><RefreshCw size={12} className={loadingTemplate ? 'animate-spin' : ''} /> Yenile</button>
                <button onClick={handleSaveTemplate} disabled={savingTemplate} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50" style={{ background: 'hsl(38 92% 50%)', color: 'hsl(215 28% 12%)' }}>
                  {savingTemplate ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <Save size={12} />} Şablonu Kaydet
                </button>
              </div>
            </div>
            {confirmReset && (
              <div className="rounded-xl p-3 mb-3 flex items-center gap-3" style={{ background: 'hsl(0 50% 18%)', border: '1px solid hsl(0 60% 30%)' }}>
                <AlertTriangle size={14} style={{ color: 'hsl(0 80% 65%)', flexShrink: 0 }} />
                <p className="text-xs flex-1" style={{ color: 'hsl(0 70% 75%)' }}>Tüm maddeler varsayılana dönecek. Emin misiniz?</p>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={async () => { setSavingTemplate(true); try { const defaults = generateFlatClauses('USD', ''); await saveMasterTemplate(defaults); setTemplateClauses(defaults); setTemplateUpdatedAt(new Date().toISOString()); const updated = await getMasterTemplateFull(); if (updated) setTemplateVersions(updated.versions || []); setConfirmReset(false); toast.success('Şablon sıfırlandı'); } catch (e: any) { toast.error(e.message); } finally { setSavingTemplate(false); } }} disabled={savingTemplate} className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium disabled:opacity-50" style={{ background: 'hsl(0 65% 38%)', color: 'white' }}><Check size={11} /> Evet</button>
                  <button onClick={() => setConfirmReset(false)} className="p-1.5 rounded" style={{ background: 'hsl(215 25% 28%)', color: 'hsl(210 20% 70%)' }}><X size={11} /></button>
                </div>
              </div>
            )}
            {showVersionHistory && templateVersions.length > 0 && (
              <div className="rounded-xl p-3 mb-3 space-y-2" style={{ background: 'hsl(215 28% 15%)', border: '1px solid hsl(220 50% 35% / 0.5)' }}>
                <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'hsl(220 70% 75%)' }}><RotateCcw size={12} /> Versiyon Geçmişi</p>
                <div className="space-y-1.5">
                  {templateVersions.map((v, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg" style={{ background: 'hsl(215 25% 20%)', border: '1px solid hsl(215 22% 28%)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium" style={{ color: 'hsl(210 20% 82%)' }}>v{templateVersions.length - idx} — {new Date(v.savedAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-xs" style={{ color: 'hsl(215 15% 48%)' }}>{v.clauses.length} madde</p>
                      </div>
                      <button onClick={async () => { setRestoringVersion(idx); try { const restored = await restoreTemplateVersion(idx); setTemplateClauses(restored); setTemplateUpdatedAt(new Date().toISOString()); const updated = await getMasterTemplateFull(); if (updated) setTemplateVersions(updated.versions || []); setShowVersionHistory(false); toast.success(`v${templateVersions.length - idx} geri yüklendi`); } catch (e: any) { toast.error(e.message); } finally { setRestoringVersion(null); } }} disabled={restoringVersion === idx} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium flex-shrink-0 disabled:opacity-50" style={{ background: 'hsl(220 60% 30%)', color: 'hsl(220 80% 85%)' }}>
                        {restoringVersion === idx ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <RotateCcw size={12} />} Geri Yükle
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="rounded-xl p-3 mb-4 flex items-start gap-2" style={{ background: 'hsl(38 92% 50% / 0.1)', border: '1px solid hsl(38 92% 50% / 0.3)' }}>
              <AlertTriangle size={14} style={{ color: 'hsl(38 92% 55%)', flexShrink: 0, marginTop: 1 }} />
              <p className="text-xs" style={{ color: 'hsl(38 92% 65%)' }}>Her satır bağımsız bir sözleşme maddesidir. Başlık satırları (1., 2., ...) kalın gösterilir. Madde taşındığında numaralar otomatik güncellenir.</p>
            </div>
            {loadingTemplate ? (
              <div className="flex items-center justify-center py-16" style={{ color: 'hsl(38 92% 50%)' }}><RefreshCw size={24} className="animate-spin" /></div>
            ) : (
              <div className="space-y-2">
                {templateClauses.map((clause, idx) => {
                  const isExpanded = expandedClauseId === clause.id;
                  const isConfirmingDelete = confirmDeleteClauseId === clause.id;
                  const isHeader = clause.isHeader === true;
                  const isActiveClause = clause.isActive;
                  return (
                    <div key={clause.id} draggable onDragStart={e => handleDragStart(e, clause.id, idx)} onDragOver={e => handleDragOver(e, clause.id)} onDrop={e => handleDrop(e, clause.id)} onDragEnd={handleDragEnd}
                      className="rounded-lg overflow-hidden transition-all"
                      style={{ background: isHeader ? 'hsl(215 28% 20%)' : 'hsl(215 28% 17%)', border: dragOverId === clause.id ? '2px solid hsl(220 80% 60%)' : isExpanded ? '1px solid hsl(38 92% 50% / 0.4)' : isConfirmingDelete ? '1px solid hsl(0 60% 40% / 0.5)' : isHeader ? '1px solid hsl(38 92% 50% / 0.2)' : '1px solid hsl(215 22% 26%)', opacity: draggingId === clause.id ? 0.45 : (isActiveClause ? 1 : 0.55), boxShadow: dragOverId === clause.id ? '0 0 0 2px hsl(220 80% 60% / 0.25)' : undefined }}>
                      {isConfirmingDelete && (
                        <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'hsl(0 50% 16%)', borderBottom: '1px solid hsl(0 55% 28%)' }}>
                          <AlertTriangle size={13} style={{ color: 'hsl(0 80% 65%)', flexShrink: 0 }} />
                          <p className="text-xs flex-1" style={{ color: 'hsl(0 70% 72%)' }}>Madde <strong>{clause.itemNumber}</strong> silinecek.</p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button onClick={e => { e.stopPropagation(); handleDeleteClause(clause.id); }} className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium" style={{ background: 'hsl(0 65% 38%)', color: 'white' }}><Trash2 size={10} /> Evet, sil</button>
                            <button onClick={e => { e.stopPropagation(); setConfirmDeleteClauseId(null); }} className="p-1 rounded" style={{ background: 'hsl(215 25% 28%)', color: 'hsl(210 20% 70%)' }}><X size={11} /></button>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2 px-2.5 py-2">
                        <div className="flex-shrink-0 cursor-grab active:cursor-grabbing" style={{ color: 'hsl(215 15% 38%)' }} onClick={e => e.stopPropagation()}><GripVertical size={13} /></div>
                        <div className="flex-shrink-0 text-xs font-bold min-w-[38px] text-center px-1 py-0.5 rounded" style={{ background: isHeader ? 'hsl(38 92% 50% / 0.15)' : 'hsl(215 25% 25%)', color: isHeader ? 'hsl(38 92% 55%)' : 'hsl(215 15% 60%)', fontSize: '10px' }}>{clause.itemNumber}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate" style={{ color: isHeader ? 'hsl(38 92% 68%)' : (isActiveClause ? 'hsl(210 20% 88%)' : 'hsl(215 15% 45%)'), fontWeight: isHeader ? 600 : 400 }}>
                            {clause.contentRu ? clause.contentRu.slice(0, 90).replace(/\n/g, ' ') + (clause.contentRu.length > 90 ? '...' : '') : <em style={{ color: 'hsl(215 15% 40%)' }}>Boş madde</em>}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleMoveClause(clause.id, 'up')} disabled={idx === 0} className="p-1 rounded disabled:opacity-25 hover:bg-white/10" style={{ color: 'hsl(215 15% 50%)' }}><ChevronUp size={12} /></button>
                          <button onClick={() => handleMoveClause(clause.id, 'down')} disabled={idx === templateClauses.length - 1} className="p-1 rounded disabled:opacity-25 hover:bg-white/10" style={{ color: 'hsl(215 15% 50%)' }}><ChevronDown size={12} /></button>
                          <button onClick={() => handleTemplateClauseToggle(clause.id)} className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: isActiveClause ? 'hsl(142 60% 25% / 0.4)' : 'hsl(215 25% 25%)', color: isActiveClause ? 'hsl(142 60% 60%)' : 'hsl(215 15% 45%)', fontSize: '10px' }}>{isActiveClause ? 'Aktif' : 'Pasif'}</button>
                          <button onClick={() => handleDuplicateClause(clause.id)} className="p-1 rounded hover:bg-white/10" style={{ color: 'hsl(215 15% 50%)' }} title="Kopyala"><Layers size={12} /></button>
                          <button onClick={() => setExpandedClauseId(isExpanded ? null : clause.id)} className="p-1 rounded hover:bg-white/10" style={{ color: isExpanded ? 'hsl(38 92% 55%)' : 'hsl(215 15% 50%)' }} title="Düzenle"><Edit2 size={12} /></button>
                          <button onClick={e => { e.stopPropagation(); setConfirmDeleteClauseId(isConfirmingDelete ? null : clause.id); setExpandedClauseId(null); }} className="p-1 rounded hover:bg-red-900/30" style={{ color: isConfirmingDelete ? 'hsl(0 70% 65%)' : 'hsl(215 15% 50%)' }} title="Sil"><Trash2 size={12} /></button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-2" style={{ borderTop: '1px solid hsl(215 22% 24%)' }}>
                          <div className="pt-2 flex items-center gap-3">
                            <div><label className="form-label-style block mb-1">Madde No</label><input value={clause.itemNumber} onChange={e => setTemplateClauses(prev => prev.map(c => c.id === clause.id ? { ...c, itemNumber: e.target.value } : c))} className="form-input-style text-xs" style={{ width: '80px' }} /></div>
                            <div className="flex items-center gap-2 mt-4"><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={clause.isHeader === true} onChange={e => setTemplateClauses(prev => prev.map(c => c.id === clause.id ? { ...c, isHeader: e.target.checked } : c))} className="rounded" /><span className="text-xs" style={{ color: 'hsl(38 92% 60%)' }}>Başlık</span></label></div>
                          </div>
                          {([{ field: 'contentRu' as const, label: '🇷🇺 Rusça' }, { field: 'contentEn' as const, label: '🇬🇧 İngilizce' }, { field: 'contentTr' as const, label: '🇹🇷 Türkçe' }]).map(({ field, label }) => (
                            <div key={field}>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'hsl(215 15% 60%)' }}>{label}</label>
                              <textarea rows={isHeader ? 2 : 6} value={clause[field] || ''} onChange={e => handleTemplateClauseUpdate(clause.id, field, e.target.value)} className="w-full rounded-lg p-2 text-xs resize-y outline-none" style={{ background: 'hsl(215 28% 13%)', border: '1px solid hsl(215 22% 27%)', color: 'hsl(210 20% 86%)', fontFamily: 'monospace', lineHeight: 1.55 }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {!loadingTemplate && (
              <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <button onClick={() => handleAddClause(false)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium" style={{ background: 'hsl(215 28% 22%)', color: 'hsl(210 20% 80%)', border: '1px dashed hsl(215 22% 34%)' }}><Plus size={14} /> Yeni Madde</button>
                  <button onClick={() => handleAddClause(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium" style={{ background: 'hsl(38 92% 50% / 0.08)', color: 'hsl(38 92% 60%)', border: '1px dashed hsl(38 92% 50% / 0.4)' }}><Plus size={14} /> Yeni Başlık</button>
                </div>
                <button onClick={handleSaveTemplate} disabled={savingTemplate} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: 'hsl(38 92% 50%)', color: 'hsl(215 28% 12%)' }}>
                  {savingTemplate ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <Save size={14} />} Şablonu Kaydet
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Contracts Tab ── */}
        {tab === 'contracts' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium" style={{ color: 'hsl(210 20% 80%)' }}>{allDrafts.length} taslak / договоров</p>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(215 15% 48%)' }}>"Manager Ata" ile müşteriyi manager'a bağlayın. Durum değişikliği Sheets'e de yansır.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleDownloadAllCsv} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'hsl(142 60% 28%)', color: 'white' }}><FileArchive size={12} /> İndir (CSV)</button>
                <button onClick={loadAllDrafts} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'hsl(215 25% 25%)', color: 'hsl(210 20% 80%)' }}><RefreshCw size={12} /> Yenile</button>
              </div>
            </div>
            {/* Status filter */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {(['all', 'draft', 'pending', 'signed'] as const).map(s => {
                const count = s === 'all' ? allDrafts.length : allDrafts.filter(d => d.status === s || (s === 'draft' && !d.status)).length;
                const labels: Record<string, string> = { all: 'Tümü', draft: 'Черновики', pending: 'İmza Bekliyor', signed: 'Подписаны' };
                return (
                  <button key={s} onClick={() => setContractStatusFilter(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: contractStatusFilter === s ? (s === 'signed' ? 'hsl(142 60% 30%)' : s === 'pending' ? 'hsl(200 80% 30%)' : 'hsl(38 92% 50%)') : 'hsl(215 25% 22%)',
                      color: contractStatusFilter === s ? (s === 'all' ? 'hsl(215 28% 12%)' : 'white') : 'hsl(210 20% 72%)',
                      border: contractStatusFilter === s ? 'none' : '1px solid hsl(215 22% 28%)',
                    }}
                  >
                    {labels[s]} <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.9)' }}>{count}</span>
                  </button>
                );
              })}
            </div>
            {allDrafts.length === 0 ? (
              <div className="text-center py-12 rounded-xl" style={{ background: 'hsl(215 28% 17%)', border: '1px solid hsl(215 22% 24%)' }}>
                <FileText size={32} style={{ color: 'hsl(215 15% 38%)', margin: '0 auto 12px' }} />
                <p className="text-sm" style={{ color: 'hsl(215 15% 50%)' }}>Нет сохранённых договоров</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allDrafts.filter(d => contractStatusFilter === 'all' || d.status === contractStatusFilter || (contractStatusFilter === 'draft' && !d.status)).map(draft => {
                  const ownerMgr = managers.find(m => m.id === draft.createdBy);
                  const assignedMgr = managers.find(m => m.id === draft.managerId);
                  const isSharing = sharingDraftId === draft.id;
                  const isAssigning = assigningDraftId === draft.id;
                  const isUpdatingStatus = updatingContractStatusId === draft.id;
                  const statusColors: Record<string, { bg: string; color: string; border: string }> = {
                    signed: { bg: 'hsl(142 50% 20%)', color: 'hsl(142 70% 60%)', border: 'hsl(142 50% 30%)' },
                    pending: { bg: 'hsl(200 60% 18%)', color: 'hsl(200 80% 68%)', border: 'hsl(200 60% 30%)' },
                    draft: { bg: 'hsl(38 60% 18%)', color: 'hsl(38 92% 65%)', border: 'hsl(38 60% 30%)' },
                  };
                  const sc = statusColors[draft.status || 'draft'];
                  return (
                    <div key={draft.id} className="rounded-xl p-4" style={{ background: isAssigning ? 'hsl(220 28% 20%)' : isSharing ? 'hsl(215 28% 20%)' : 'hsl(215 28% 17%)', border: `1px solid ${isAssigning ? 'hsl(220 60% 40% / 0.5)' : isSharing ? 'hsl(38 92% 50% / 0.4)' : 'hsl(215 22% 25%)'}` }}>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0" style={{ background: sc.bg }}><FileText size={16} style={{ color: sc.color }} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold" style={{ color: 'hsl(210 20% 88%)' }}>{draft.contractNumber || 'Черновик'}</p>
                            <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                              {draft.status === 'signed' ? '✓ Подписан' : draft.status === 'pending' ? '⏳ İmza Bekliyor' : 'Черновик'}
                            </span>
                            {assignedMgr && (
                              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80" style={{ background: 'hsl(220 60% 28% / 0.5)', color: 'hsl(220 80% 78%)' }} title="Atamayı kaldır" onClick={() => handleUnassignDraft(draft)}>
                                <UserCheck size={9} /> {assignedMgr.name} <X size={9} />
                              </span>
                            )}
                          </div>
                          <p className="text-xs" style={{ color: 'hsl(215 15% 50%)' }}>{draft.clientName || 'Без клиента'}{ownerMgr && <span className="ml-2">· {ownerMgr.name}</span>}</p>
                          <p className="text-xs" style={{ color: 'hsl(215 15% 40%)' }}>{new Date(draft.updatedAt).toLocaleDateString('ru-RU')}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {/* Status change dropdown */}
                          <div className="relative">
                            <select
                              value={draft.status || 'draft'}
                              onChange={e => handleChangeContractStatus(draft, e.target.value as 'draft' | 'pending' | 'signed')}
                              disabled={isUpdatingStatus}
                              className="text-xs px-2 py-1.5 rounded font-medium cursor-pointer outline-none disabled:opacity-50"
                              style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                            >
                              <option value="draft">Черновик</option>
                              <option value="pending">İmza Bekliyor</option>
                              <option value="signed">Подписан</option>
                            </select>
                            {isUpdatingStatus && <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: sc.color }} />}
                          </div>
                          <button onClick={() => handleDeleteContract(draft)} disabled={deletingContractId === draft.id} className="p-1.5 rounded transition-all hover:bg-red-900/30 disabled:opacity-40" style={{ color: 'hsl(215 15% 55%)' }}>
                            {deletingContractId === draft.id ? <SpinnerIcon size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                          <button onClick={() => { setAssigningDraftId(isAssigning ? null : draft.id); setAssignTargetId(''); setSharingDraftId(null); }} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium" style={{ background: isAssigning ? 'hsl(215 25% 28%)' : 'hsl(220 60% 30%)', color: 'white' }}>
                            <UserCheck size={12} />{isAssigning ? 'İptal' : 'Manager Ata'}
                          </button>
                          <button onClick={() => { setSharingDraftId(isSharing ? null : draft.id); setShareTargetId(''); setAssigningDraftId(null); }} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium" style={{ background: isSharing ? 'hsl(215 25% 28%)' : 'hsl(200 60% 28%)', color: 'white' }}>
                            <Share2 size={12} />{isSharing ? 'İptal' : 'Paylaş'}
                          </button>
                        </div>
                      </div>
                      {isAssigning && (
                        <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid hsl(215 22% 28%)' }}>
                          <p className="text-xs" style={{ color: 'hsl(220 70% 75%)' }}>Seçilen manager bu sözleşmeyi kendi panelinde görebilir</p>
                          <div className="flex items-center gap-2">
                            <select className="flex-1 form-select-style text-xs" value={assignTargetId} onChange={e => setAssignTargetId(e.target.value)}>
                              <option value="">— Manager seç —</option>
                              {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            <button onClick={() => handleAssignDraft(draft)} disabled={!assignTargetId} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50" style={{ background: 'hsl(220 60% 35%)', color: 'white', flexShrink: 0 }}>
                              <Check size={12} /> Ata
                            </button>
                          </div>
                        </div>
                      )}
                      {isSharing && (
                        <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: '1px solid hsl(215 22% 28%)' }}>
                          <select className="flex-1 form-select-style text-xs" value={shareTargetId} onChange={e => setShareTargetId(e.target.value)}>
                            <option value="">— Kullanıcı seç —</option>
                            {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                          <button onClick={() => handleShareDraft(draft)} disabled={!shareTargetId} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50" style={{ background: 'hsl(142 60% 28%)', color: 'white', flexShrink: 0 }}>
                            <Check size={12} /> Gönder
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Storage Tab ── */}
        {tab === 'storage' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium" style={{ color: 'hsl(210 20% 80%)' }}>Supabase Depolama</p>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(215 15% 48%)' }}>contract-pdfs + company-assets</p>
              </div>
              <button onClick={loadStorageStats} disabled={loadingStats} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50" style={{ background: 'hsl(215 25% 25%)', color: 'hsl(210 20% 80%)' }}>
                <RefreshCw size={12} className={loadingStats ? 'animate-spin' : ''} /> Yenile
              </button>
            </div>

            {/* ── Google Drive OAuth2 Entegrasyonu ── */}
            <div className="rounded-xl p-4 mb-4 space-y-4" style={{ background: 'hsl(215 28% 18%)', border: '1px solid hsl(215 22% 28%)' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'hsl(200 70% 65%)' }}>
                  <Globe size={13} /> Google Drive OAuth2 Entegrasyonu
                </p>
                <button onClick={loadServiceAccountInfo} disabled={loadingServiceAccount} className="p-1.5 rounded disabled:opacity-50 transition-all" style={{ background: 'hsl(215 25% 24%)', color: 'hsl(215 15% 60%)' }} title="Yenile">
                  <RefreshCw size={11} className={loadingServiceAccount ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Connection status */}
              {oauthConnectedEmail ? (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: 'hsl(142 50% 14%)', border: '1px solid hsl(142 55% 28%)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(142 70% 50%)' }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'hsl(142 70% 65%)' }}>Hesap bağlı</p>
                      <p className="text-xs" style={{ color: 'hsl(142 50% 55%)' }}>{oauthConnectedEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleConnectOAuth} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'white', color: '#444' }}>
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" width={14} height={14} />
                      Yeniden Bağlan
                    </button>
                    <button onClick={handleDisconnectOAuth} disabled={disconnectingOAuth} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50" style={{ background: 'hsl(0 55% 30%)', color: 'hsl(0 80% 80%)' }}>
                      {disconnectingOAuth ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <X size={11} />} Bağlantıyı Kes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'hsl(215 28% 14%)', border: '1px solid hsl(215 22% 26%)' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(215 15% 40%)' }} />
                  <p className="text-xs" style={{ color: 'hsl(215 15% 52%)' }}>Bağlı hesap yok</p>
                </div>
              )}

              {/* OAuth Redirect URL */}
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'hsl(215 15% 58%)' }}>OAuth Redirect URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-2.5 py-2 rounded-lg text-xs font-mono break-all" style={{ background: 'hsl(215 28% 13%)', border: '1px solid hsl(215 22% 26%)', color: 'hsl(200 70% 68%)' }}>
                    {window.location.origin}/oauth/callback
                  </code>
                  <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/oauth/callback'); toast.success('Kopyalandı!'); }} className="flex-shrink-0 px-2.5 py-2 rounded-lg text-xs font-medium" style={{ background: 'hsl(215 25% 24%)', color: 'hsl(215 15% 65%)' }}>
                    Kopyala
                  </button>
                </div>
                <p className="text-xs mt-1" style={{ color: 'hsl(215 15% 42%)' }}>Google Cloud Console → Credentials → OAuth 2.0 Client → Authorized redirect URIs alanına bu URL'yi girin</p>
              </div>

              {/* Client ID + Secret */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="form-label-style block mb-1">Client ID <span style={{ color: 'hsl(0 70% 60%)' }}>*</span></label>
                  <input className="form-input-style" value={oauthClientId} onChange={e => setOauthClientId(e.target.value)} placeholder="1019352546267-xxx.apps.googleusercontent.com" />
                </div>
                <div>
                  <label className="form-label-style block mb-1">Client Secret <span style={{ color: 'hsl(0 70% 60%)' }}>*</span></label>
                  <div className="relative">
                    <input className="form-input-style pr-9" type={showOAuthSecret ? 'text' : 'password'} value={oauthClientSecret} onChange={e => setOauthClientSecret(e.target.value)} placeholder="GOCSPX-..." />
                    <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'hsl(215 15% 50%)' }} onClick={() => setShowOAuthSecret(v => !v)}>{showOAuthSecret ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={handleSaveOAuthCredentials} disabled={savingOAuthCreds || !oauthClientId.trim() || !oauthClientSecret.trim()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40" style={{ background: 'hsl(215 25% 28%)', color: 'hsl(210 20% 80%)' }}>
                  {savingOAuthCreds ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <Save size={12} />} Bilgileri Kaydet
                </button>
                <button onClick={handleConnectOAuth} disabled={connectingOAuth || !oauthClientId.trim()} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 transition-all hover:opacity-90" style={{ background: 'white', color: '#3c4043', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                  {connectingOAuth ? <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin inline-block" /> : <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={18} height={18} />}
                  Google ile Bağlan
                </button>
              </div>

              {/* Drive test */}
              <div className="flex items-center gap-2">
                <button onClick={handleTestDriveConnection} disabled={testingDrive || !oauthConnectedEmail} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium disabled:opacity-40" style={{ background: 'hsl(200 60% 28%)', color: 'hsl(200 80% 85%)' }}>
                  {testingDrive ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <FlaskConical size={12} />} Drive Testi
                </button>
                {driveTestResult === 'success' && <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'hsl(142 70% 55%)' }}><Check size={11} /> Bağlantı başarılı</span>}
                {driveTestResult === 'error' && <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'hsl(0 70% 65%)' }}><X size={11} /> Bağlantı hatası</span>}
              </div>

              {/* Instructions */}
              <div className="p-3 rounded-lg space-y-1.5" style={{ background: 'hsl(215 28% 14%)', border: '1px solid hsl(215 22% 24%)' }}>
                <p className="text-xs font-semibold" style={{ color: 'hsl(215 15% 60%)' }}>📖 Kurulum Adımları</p>
                <p className="text-xs" style={{ color: 'hsl(215 15% 50%)' }}>1. <strong style={{ color: 'hsl(200 65% 65%)' }}>Google Cloud Console</strong> → APIs &amp; Services → Credentials → Create OAuth 2.0 Client ID (Web application)</p>
                <p className="text-xs" style={{ color: 'hsl(215 15% 50%)' }}>2. Authorized redirect URIs alanına yukarıdaki Redirect URL'yi ekleyin</p>
                <p className="text-xs" style={{ color: 'hsl(215 15% 50%)' }}>3. Client ID ve Client Secret'i buraya girin → "Bilgileri Kaydet" → "Google ile Bağlan"</p>
                <p className="text-xs" style={{ color: 'hsl(215 15% 50%)' }}>4. <strong style={{ color: 'hsl(200 65% 65%)' }}>Google Drive API</strong>'nin Cloud Console'da etkinleştirildiğinden emin olun</p>
                <p className="text-xs" style={{ color: 'hsl(215 15% 50%)' }}>5. Bağlantı kurulduktan sonra manager'a Drive klasör ID ekleyin — PDF'ler otomatik yüklenir</p>
              </div>

              {/* Servis Hesabı (collapsed) */}
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid hsl(215 22% 26%)' }}>
                <button onClick={() => setShowSaPanel(v => !v)} className="w-full flex items-center justify-between px-3 py-2.5" style={{ background: 'hsl(215 28% 15%)' }}>
                  <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'hsl(215 15% 52%)' }}>
                    <Shield size={11} /> Servis Hesabı (Gelişmiş / Yedek)
                  </p>
                  {showSaPanel ? <ChevronUp size={12} style={{ color: 'hsl(215 15% 45%)' }} /> : <ChevronDown size={12} style={{ color: 'hsl(215 15% 45%)' }} />}
                </button>
                {showSaPanel && (
                  <div className="p-3 space-y-3" style={{ background: 'hsl(215 28% 14%)' }}>
                    {currentServiceEmail && (
                      <div className="px-3 py-2 rounded-lg" style={{ background: 'hsl(215 25% 18%)', border: '1px solid hsl(215 22% 26%)' }}>
                        <p className="text-xs" style={{ color: 'hsl(215 15% 50%)' }}>Aktif Servis E-postası</p>
                        <p className="text-xs font-mono mt-0.5 break-all" style={{ color: 'hsl(142 65% 58%)' }}>{currentServiceEmail}</p>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="form-label-style">Servis Hesabı JSON</label>
                        <button onClick={() => saJsonFileRef.current?.click()} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium" style={{ background: 'hsl(200 60% 25%)', color: 'hsl(200 80% 80%)' }}><Upload size={10} /> .json Yükle</button>
                      </div>
                      <input type="file" accept=".json,application/json" className="hidden" ref={saJsonFileRef} onChange={e => { const f = e.target.files?.[0]; if (f) handleServiceAccountFileUpload(f); e.target.value = ''; }} />
                      <textarea rows={5} value={serviceAccountJson} onChange={e => setServiceAccountJson(e.target.value)}
                        placeholder={`{\n  "type": "service_account",\n  "client_email": "name@project.iam.gserviceaccount.com"\n}`}
                        className="w-full rounded-lg p-2.5 text-xs resize-y outline-none"
                        style={{ background: 'hsl(215 28% 12%)', border: '1px solid hsl(215 22% 26%)', color: 'hsl(210 20% 86%)', fontFamily: 'monospace', lineHeight: 1.5 }} />
                    </div>
                    <button onClick={handleSaveServiceAccount} disabled={savingServiceAccount || !serviceAccountJson.trim()} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium disabled:opacity-40" style={{ background: 'hsl(142 60% 28%)', color: 'white' }}>
                      {savingServiceAccount ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <Check size={12} />} Kaydet
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Ana E-Tablolar ── */}
            <div className="rounded-xl p-4 mb-4 space-y-3" style={{ background: 'hsl(215 28% 18%)', border: '1px solid hsl(215 22% 28%)' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'hsl(142 70% 60%)' }}>
                  <Database size={13} /> Ana E-Tablolar (Google Sheets)
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={loadMainSheets} disabled={loadingMainSheets} className="p-1.5 rounded transition-all disabled:opacity-50" style={{ background: 'hsl(215 25% 24%)', color: 'hsl(215 15% 60%)' }} title="Yenile">
                    <RefreshCw size={11} className={loadingMainSheets ? 'animate-spin' : ''} />
                  </button>
                  <button onClick={() => setAddingMainSheet(v => !v)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium" style={{ background: 'hsl(142 60% 28%)', color: 'white' }}>
                    <Plus size={11} /> Tablo Ekle
                  </button>
                </div>
              </div>
              <p className="text-xs" style={{ color: 'hsl(215 15% 50%)' }}>Sözleşmeler kayıt edildiğinde <strong style={{ color: 'hsl(142 65% 58%)' }}>tüm aktif tablolara</strong> aynı anda yazılır. Birden fazla ana tablo ekleyebilirsiniz.</p>

              {/* Add form */}
              {addingMainSheet && (
                <div className="rounded-lg p-3 space-y-2" style={{ background: 'hsl(215 25% 22%)', border: '1px solid hsl(142 60% 28% / 0.4)' }}>
                  <p className="text-xs font-semibold" style={{ color: 'hsl(142 70% 60%)' }}>Yeni Ana E-Tablo</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="form-label-style block mb-1">Spreadsheet ID *</label>
                      <input className="form-input-style" value={newMainSheet.spreadsheet_id} onChange={e => setNewMainSheet(p => ({ ...p, spreadsheet_id: e.target.value }))} placeholder="1tVIljUf6_DG-x0LlkXrqDlsDszcgFH8eWV9VddBCOx4" />
                    </div>
                    <div>
                      <label className="form-label-style block mb-1">Sayfa Adı *</label>
                      <input className="form-input-style" value={newMainSheet.sheet_name} onChange={e => setNewMainSheet(p => ({ ...p, sheet_name: e.target.value }))} placeholder="YAZILIM2026" />
                    </div>
                  </div>
                  <div>
                    <label className="form-label-style block mb-1">Etiket (isteğe bağlı)</label>
                    <input className="form-input-style" value={newMainSheet.label} onChange={e => setNewMainSheet(p => ({ ...p, label: e.target.value }))} placeholder="Ana Tablo / Yedek Tablo" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleAddMainSheet} disabled={savingMainSheet} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50" style={{ background: 'hsl(142 60% 28%)', color: 'white' }}>
                      {savingMainSheet ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <Check size={12} />} Kaydet
                    </button>
                    <button onClick={() => setAddingMainSheet(false)} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium" style={{ background: 'hsl(215 25% 25%)', color: 'hsl(210 20% 75%)' }}><X size={12} /> İptal</button>
                  </div>
                </div>
              )}

              {/* List */}
              {loadingMainSheets ? (
                <div className="flex items-center justify-center py-4" style={{ color: 'hsl(38 92% 50%)' }}><RefreshCw size={16} className="animate-spin" /></div>
              ) : mainSheets.length === 0 ? (
                <div className="text-center py-4 rounded-lg" style={{ background: 'hsl(215 25% 22%)', border: '1px dashed hsl(215 22% 32%)' }}>
                  <p className="text-xs" style={{ color: 'hsl(215 15% 45%)', fontStyle: 'italic' }}>Ana e-tablo eklenmemiş — Edge Function varsayılanı kullanılıyor</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {mainSheets.map(sheet => {
                    const isEditing = editingMainSheetId === sheet.id;
                    return (
                      <div key={sheet.id} className="rounded-lg overflow-hidden" style={{ background: isEditing ? 'hsl(215 25% 22%)' : 'hsl(215 25% 20%)', border: `1px solid ${isEditing ? 'hsl(142 60% 28% / 0.6)' : 'hsl(215 22% 28%)'}`, opacity: sheet.is_active ? 1 : 0.6 }}>
                        {isEditing ? (
                          <div className="p-3 space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="sm:col-span-2">
                                <label className="form-label-style block mb-1">Spreadsheet ID *</label>
                                <input className="form-input-style" value={editMainSheetData.spreadsheet_id ?? sheet.spreadsheet_id} onChange={e => setEditMainSheetData(p => ({ ...p, spreadsheet_id: e.target.value }))} />
                              </div>
                              <div>
                                <label className="form-label-style block mb-1">Sayfa Adı *</label>
                                <input className="form-input-style" value={editMainSheetData.sheet_name ?? sheet.sheet_name} onChange={e => setEditMainSheetData(p => ({ ...p, sheet_name: e.target.value }))} />
                              </div>
                            </div>
                            <div>
                              <label className="form-label-style block mb-1">Etiket</label>
                              <input className="form-input-style" value={editMainSheetData.label ?? sheet.label} onChange={e => setEditMainSheetData(p => ({ ...p, label: e.target.value }))} />
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleUpdateMainSheet(sheet.id)} disabled={savingMainSheet} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50" style={{ background: 'hsl(142 60% 28%)', color: 'white' }}>
                                {savingMainSheet ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <Check size={12} />} Güncelle
                              </button>
                              <button onClick={() => { setEditingMainSheetId(null); setEditMainSheetData({}); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium" style={{ background: 'hsl(215 25% 25%)', color: 'hsl(210 20% 75%)' }}><X size={12} /> İptal</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 px-3 py-2.5">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0" style={{ background: sheet.is_active ? 'hsl(142 50% 20%)' : 'hsl(215 25% 24%)' }}>
                              <Database size={14} style={{ color: sheet.is_active ? 'hsl(142 65% 55%)' : 'hsl(215 15% 45%)' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs font-semibold" style={{ color: sheet.is_active ? 'hsl(210 20% 88%)' : 'hsl(215 15% 50%)' }}>{sheet.label || sheet.sheet_name}</p>
                                {!sheet.is_active && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'hsl(215 25% 26%)', color: 'hsl(215 15% 48%)' }}>Pasif</span>}
                              </div>
                              <p className="text-xs font-mono mt-0.5 truncate" style={{ color: 'hsl(215 15% 48%)' }}>{sheet.spreadsheet_id} / <strong style={{ color: 'hsl(200 65% 60%)' }}>{sheet.sheet_name}</strong></p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleTestMainSheet(sheet)}
                                disabled={testingMainSheetId === sheet.id}
                                className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all disabled:opacity-50"
                                style={{ background: 'hsl(200 60% 25% / 0.5)', color: 'hsl(200 80% 70%)' }}
                                title="Test et"
                              >
                                {testingMainSheetId === sheet.id ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <FlaskConical size={12} />}
                                <span className="hidden sm:inline">Test</span>
                              </button>
                              <button
                                onClick={() => updateMainSheet(sheet.id, { is_active: !sheet.is_active }).then(loadMainSheets)}
                                className="px-2 py-0.5 rounded text-xs font-medium"
                                style={{ background: sheet.is_active ? 'hsl(142 60% 25% / 0.4)' : 'hsl(215 25% 25%)', color: sheet.is_active ? 'hsl(142 60% 60%)' : 'hsl(215 15% 45%)', fontSize: '10px' }}
                              >
                                {sheet.is_active ? 'Aktif' : 'Pasif'}
                              </button>
                              <button onClick={() => { setEditingMainSheetId(sheet.id); setEditMainSheetData({}); }} className="p-1.5 rounded hover:bg-white/10" style={{ color: 'hsl(215 15% 55%)' }} title="Düzenle"><Edit2 size={13} /></button>
                              <button onClick={() => handleDeleteMainSheet(sheet.id)} disabled={deletingMainSheetId === sheet.id} className="p-1.5 rounded hover:bg-red-900/30 disabled:opacity-40" style={{ color: 'hsl(215 15% 55%)' }} title="Sil">
                                {deletingMainSheetId === sheet.id ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <Trash2 size={13} />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Storage usage progress bar */}
            {storageStats && (() => {
              const usedPct = Math.min(100, (storageStats.totalBytes / STORAGE_LIMIT_BYTES) * 100);
              const remainingBytes = Math.max(0, STORAGE_LIMIT_BYTES - storageStats.totalBytes);
              const barColor = usedPct > 85 ? 'hsl(0 70% 50%)' : usedPct > 60 ? 'hsl(38 92% 50%)' : 'hsl(142 60% 40%)';
              return (
                <div className="rounded-xl p-4 mb-4" style={{ background: 'hsl(215 28% 18%)', border: '1px solid hsl(215 22% 28%)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'hsl(210 20% 82%)' }}>
                      <HardDrive size={13} /> Depolama Kullanımı
                    </p>
                    <span className="text-xs font-mono" style={{ color: usedPct > 85 ? 'hsl(0 70% 65%)' : 'hsl(215 15% 60%)' }}>
                      {usedPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'hsl(215 25% 24%)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${usedPct}%`, background: barColor }} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs" style={{ color: 'hsl(215 15% 52%)' }}>Kullanılan: <strong style={{ color: barColor }}>{formatBytes(storageStats.totalBytes)}</strong></span>
                    <span className="text-xs" style={{ color: 'hsl(215 15% 52%)' }}>Kalan: <strong style={{ color: 'hsl(142 60% 55%)' }}>{formatBytes(remainingBytes)}</strong> / 1 GB</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="rounded-lg px-3 py-2" style={{ background: 'hsl(215 25% 22%)', border: '1px solid hsl(215 22% 30%)' }}>
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs" style={{ color: 'hsl(215 15% 50%)' }}>📄 Sözleşme PDF</p>
                        {storageStats.pdfFiles > 0 && (
                          confirmDeletePdfs ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs" style={{ color: 'hsl(0 80% 65%)' }}>Emin?</span>
                              <button onClick={handleDeleteAllPdfFiles} disabled={deletingPdfFiles} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium disabled:opacity-50" style={{ background: 'hsl(0 65% 38%)', color: 'white' }}>
                                {deletingPdfFiles ? <span className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <Check size={9} />} Evet
                              </button>
                              <button onClick={() => setConfirmDeletePdfs(false)} className="p-0.5 rounded" style={{ background: 'hsl(215 25% 28%)', color: 'hsl(210 20% 70%)' }}><X size={9} /></button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDeletePdfs(true)} className="p-1 rounded hover:bg-red-900/30 transition-all" style={{ color: 'hsl(0 60% 55%)' }} title="Tüm PDF'leri sil"><Trash2 size={11} /></button>
                          )
                        )}
                      </div>
                      <p className="text-sm font-semibold mt-0.5" style={{ color: 'hsl(38 92% 55%)' }}>{storageStats.pdfFiles} dosya</p>
                      <p className="text-xs" style={{ color: 'hsl(215 15% 45%)' }}>{formatBytes(storageStats.pdfBytes)}</p>
                    </div>
                    <div className="rounded-lg px-3 py-2" style={{ background: 'hsl(215 25% 22%)', border: '1px solid hsl(215 22% 30%)' }}>
                      <p className="text-xs" style={{ color: 'hsl(215 15% 50%)' }}>🖼️ Mühür / İmza</p>
                      <p className="text-sm font-semibold mt-0.5" style={{ color: 'hsl(200 70% 60%)' }}>{storageStats.assetFiles} dosya</p>
                      <p className="text-xs" style={{ color: 'hsl(215 15% 45%)' }}>{formatBytes(storageStats.assetBytes)}</p>
                    </div>
                  </div>
                  {storageStats.lastUpdated && (
                    <p className="text-xs mt-2" style={{ color: 'hsl(215 15% 38%)' }}>Son güncelleme: {storageStats.lastUpdated.toLocaleString('tr-TR')}</p>
                  )}
                </div>
              );
            })()}
            <div className="rounded-xl p-4 mb-4 space-y-3" style={{ background: 'hsl(215 28% 18%)', border: '1px solid hsl(215 22% 28%)' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'hsl(200 70% 65%)' }}><TrendingUp size={13} /> Döviz Kuru Ayarları</p>
                <div className="flex items-center gap-2">
                  <button onClick={fetchLiveRates} disabled={fetchingLiveRates} className="flex items-center gap-1 px-2 py-1 rounded text-xs disabled:opacity-50" style={{ background: 'hsl(215 25% 24%)', color: 'hsl(215 15% 65%)' }}>
                    {fetchingLiveRates ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <RefreshCw size={10} />} Güncel kur
                  </button>
                  <button onClick={handleClearManualRates} className="flex items-center gap-1 px-2 py-1 rounded text-xs" style={{ background: 'hsl(215 25% 24%)', color: 'hsl(215 15% 55%)' }}><X size={10} /> Temizle</button>
                </div>
              </div>
              <p className="text-xs" style={{ color: 'hsl(215 15% 50%)' }}><strong style={{ color: 'hsl(38 92% 60%)' }}>Değer girilirse sabit kur</strong> kullanılır. <strong style={{ color: 'hsl(200 70% 65%)' }}>Boş bırakılırsa internet kuruna</strong> göre otomatik dönüşüm yapılır.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['UZS', 'KZT', 'RUB'] as const).map(cur => (
                  <div key={cur} className="p-3 rounded-lg space-y-1.5" style={{ background: 'hsl(215 25% 22%)', border: '1px solid hsl(215 22% 30%)' }}>
                    <label className="form-label-style block">1 USD = ? {cur}</label>
                    <input type="number" min={0} placeholder={cur === 'UZS' ? '12850' : cur === 'KZT' ? '465' : '90'} value={manualRates[cur] ?? ''} onChange={e => setManualRates(p => ({ ...p, [cur]: e.target.value }))} className="form-input-style w-full" />
                    <div className="flex flex-col gap-0.5">
                      {manualRates[cur]?.trim() && <p className="text-xs font-medium" style={{ color: 'hsl(38 92% 55%)' }}>✓ Sabit: {parseFloat(manualRates[cur]).toLocaleString('ru-RU')} {cur}</p>}
                      {liveRates[cur] != null && <p className="text-xs" style={{ color: 'hsl(215 15% 48%)' }}>İnternet: {Math.round(liveRates[cur]!).toLocaleString('ru-RU')} {cur}</p>}
                      {!manualRates[cur]?.trim() && liveRates[cur] == null && <p className="text-xs" style={{ color: 'hsl(215 15% 40%)', fontStyle: 'italic' }}>Otomatik</p>}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleSaveManualRates} disabled={savingRates} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50" style={{ background: 'hsl(200 60% 30%)', color: 'hsl(200 80% 85%)' }}>
                {savingRates ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <Check size={12} />} Kurları Kaydet
              </button>
            </div>
            <div className="rounded-xl p-4 mb-4 space-y-3" style={{ background: 'hsl(215 28% 18%)', border: '1px solid hsl(215 22% 28%)' }}>
              <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'hsl(38 92% 55%)' }}><RotateCcw size={13} /> Sayaç Yönetimi</p>
              <p className="text-xs" style={{ color: 'hsl(215 15% 50%)' }}>Her şirket için başlangıç numarasını belirleyin. Yeni yılda otomatik sıfırlanır.</p>
              {COMPANIES.map(c => {
                const prefix = getCompanyPrefix(c.id);
                const year = String(new Date().getFullYear()).slice(-2);
                const preview = counterInputs[c.id] ? `${prefix}${String(parseInt(counterInputs[c.id]||'0',10)).padStart(2,'0')}-${year}` : null;
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'hsl(215 25% 22%)', border: '1px solid hsl(215 22% 30%)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium" style={{ color: 'hsl(210 20% 82%)' }}>{prefix} — {c.nameRu}</p>
                      {preview && <p className="text-xs mt-0.5" style={{ color: 'hsl(38 92% 55%)' }}>Sonraki: {preview}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <input type="number" min={1} placeholder="№" value={counterInputs[c.id] ?? ''} onChange={e => setCounterInputs(p => ({ ...p, [c.id]: e.target.value }))} className="form-input-style text-center" style={{ width: '72px' }} />
                      <button onClick={() => handleSetCounter(c.id)} disabled={savingCounter === c.id || !counterInputs[c.id]?.trim()} className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium disabled:opacity-40" style={{ background: 'hsl(38 92% 50%)', color: 'hsl(215 28% 12%)' }}>
                        {savingCounter === c.id ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <Check size={12} />} Ayarla
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rounded-xl p-4 mb-6 space-y-3" style={{ background: 'hsl(0 40% 14%)', border: '1px solid hsl(0 60% 28%)' }}>
              <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'hsl(0 80% 65%)' }}><AlertTriangle size={13} /> Tehlikeli Alan</p>
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg" style={{ background: 'hsl(0 30% 18%)', border: '1px solid hsl(0 40% 26%)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" style={{ color: 'hsl(210 20% 80%)' }}>Tüm Sayaçları Sıfırla</p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(215 15% 48%)' }}>Tüm şirketler №1'den başlar</p>
                </div>
                <button onClick={handleResetCounters} disabled={resettingCounters} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium flex-shrink-0 disabled:opacity-50" style={{ background: 'hsl(38 70% 28%)', color: 'hsl(38 92% 75%)' }}>
                  {resettingCounters ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <RotateCcw size={12} />} Sıfırla
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg" style={{ background: 'hsl(0 30% 18%)', border: '1px solid hsl(0 40% 26%)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" style={{ color: 'hsl(210 20% 80%)' }}>Tüm Test Verilerini Sil</p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(215 15% 48%)' }}>Tüm taslaklar + PDF'ler + sayaçlar silinir</p>
                </div>
                {!confirmCleanup ? (
                  <button onClick={() => setConfirmCleanup(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium flex-shrink-0" style={{ background: 'hsl(0 60% 28%)', color: 'hsl(0 80% 75%)' }}><Trash2 size={12} /> Sil</button>
                ) : (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs" style={{ color: 'hsl(0 80% 65%)' }}>Emin misiniz?</span>
                    <button onClick={handleDeleteAllTestData} disabled={deletingTestData} className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium disabled:opacity-50" style={{ background: 'hsl(0 70% 38%)', color: 'white' }}>
                      {deletingTestData ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <Check size={11} />} Evet
                    </button>
                    <button onClick={() => setConfirmCleanup(false)} className="p-1.5 rounded" style={{ background: 'hsl(215 25% 28%)', color: 'hsl(210 20% 70%)' }}><X size={11} /></button>
                  </div>
                )}
              </div>
            </div>
            {!storageStats && (
              <div className="rounded-xl py-14 text-center mb-4" style={{ background: 'hsl(215 28% 17%)', border: '1px solid hsl(215 22% 24%)' }}>
                {loadingStats ? (
                  <><RefreshCw size={32} className="animate-spin mx-auto mb-3" style={{ color: 'hsl(38 92% 50%)' }} /><p className="text-sm" style={{ color: 'hsl(215 15% 55%)' }}>Yükleniyor...</p></>
                ) : (
                  <><HardDrive size={32} style={{ color: 'hsl(215 15% 40%)', margin: '0 auto 12px' }} /><p className="text-sm" style={{ color: 'hsl(215 15% 55%)' }}>Yukarıdaki "Yenile" butonuna tıklayın</p></>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Assets Tab ── */}
        {tab === 'assets' && (
          <div className="space-y-3">
            <p className="text-xs mb-4" style={{ color: 'hsl(215 15% 55%)' }}>Загрузите печать и подпись для каждой компании (PNG с прозрачным фоном)</p>
            {loadingForwarders ? (
              <div className="flex items-center justify-center py-12" style={{ color: 'hsl(38 92% 50%)' }}><RefreshCw size={22} className="animate-spin" /></div>
            ) : forwarders.length === 0 ? (
              <div className="text-center py-10 rounded-xl" style={{ background: 'hsl(215 28% 16%)', border: '1px solid hsl(215 22% 24%)' }}>
                <p className="text-sm" style={{ color: 'hsl(215 15% 50%)' }}>Önce Ekspeditörler sekmesinden firma ekleyin</p>
              </div>
            ) : forwarders.map(company => {
              const legacyAssets = assets[company.id] || { companyId: company.id };
              const currentStampUrl = company.stampUrl || legacyAssets.stampUrl || '';
              const currentSigUrl = company.signatureUrl || legacyAssets.signatureUrl || '';
              const isExpanded = expandedCompany === company.id;
              // Live scales: from drag state while sliding, from DB when idle
              const liveStampScale = previewScales[company.id]?.stamp ?? (company.stampScale ?? 1);
              const liveSigScale = previewScales[company.id]?.sig ?? (company.signatureScale ?? 1);
              return (
                <div key={company.id} className="rounded-xl overflow-hidden" style={{ background: 'hsl(215 28% 17%)', border: `1px solid ${isExpanded ? 'hsl(38 92% 50% / 0.3)' : 'hsl(215 22% 24%)'}` }}>
                  <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => setExpandedCompany(isExpanded ? null : company.id)}>
                    <Building2 size={16} style={{ color: 'hsl(38 92% 50%)', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'hsl(210 20% 90%)' }}>{company.companyNameRu}</p>
                      <p className="text-xs" style={{ color: 'hsl(215 15% 50%)' }}>{company.city || company.id} · {currentStampUrl ? '✓ Печать' : '✗ Без печати'} · {currentSigUrl ? '✓ Подпись' : '✗ Без подписи'}</p>
                    </div>
                    {isExpanded ? <ChevronUp size={16} style={{ color: 'hsl(215 15% 50%)' }} /> : <ChevronDown size={16} style={{ color: 'hsl(215 15% 50%)' }} />}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4" style={{ borderTop: '1px solid hsl(215 22% 24%)' }}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                        {/* Stamp */}
                        <div>
                          <p className="form-label-style mb-2 flex items-center gap-1.5"><Stamp size={12} /> Печать / Stamp</p>
                          <div className="rounded-lg p-3 text-center relative" style={{ background: 'hsl(215 25% 22%)', border: '2px dashed hsl(215 22% 32%)', minHeight: '120px' }}>
                            {currentStampUrl ? (
                              <div className="relative inline-block">
                                <img src={currentStampUrl} alt="stamp" className="max-h-24 max-w-full object-contain mx-auto" />
                                <button onClick={() => handleRemoveAsset(company.id, 'stamp')} className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'hsl(0 72% 51%)', color: 'white' }}><X size={10} /></button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-20"><ImageIcon size={24} style={{ color: 'hsl(215 15% 40%)' }} /><p className="text-xs mt-1" style={{ color: 'hsl(215 15% 45%)' }}>Нет печати</p></div>
                            )}
                          </div>
                          {currentStampUrl && (
                            <div className="mt-2 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs" style={{ color: 'hsl(215 15% 55%)' }}>Varsayılan boyut</span>
                                <span className="text-xs font-mono font-semibold" style={{ color: 'hsl(38 92% 60%)' }}>{Math.round(liveStampScale * 100)}%</span>
                              </div>
                              <input type="range" min="0.3" max="3" step="0.05"
                                value={liveStampScale}
                                onChange={e => {
                                  const v = parseFloat(e.target.value);
                                  setPreviewScales(p => ({ ...p, [company.id]: { stamp: v, sig: p[company.id]?.sig ?? (company.signatureScale ?? 1) } }));
                                }}
                                onMouseUp={async e => {
                                  const v = parseFloat((e.target as HTMLInputElement).value);
                                  await updateForwarder(company.id, { stampScale: v });
                                  await loadForwarders();
                                  toast.success('Mühür boyutu kaydedildi');
                                }}
                                onTouchEnd={async e => {
                                  const v = parseFloat((e.target as HTMLInputElement).value);
                                  await updateForwarder(company.id, { stampScale: v });
                                  await loadForwarders();
                                }}
                                className="w-full accent-amber-400" style={{ height: '4px' }}
                              />
                            </div>
                          )}
                          <input type="file" accept="image/*" className="hidden" ref={el => { stampRefs.current[company.id] = el; }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(company.id, 'stamp', f); }} />
                          <button onClick={() => stampRefs.current[company.id]?.click()} className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded text-xs font-medium" style={{ background: 'hsl(215 25% 26%)', color: 'hsl(210 20% 80%)' }}><Upload size={12} /> {currentStampUrl ? 'Замените' : 'Yükle'} печать</button>
                        </div>
                        {/* Signature */}
                        <div>
                          <p className="form-label-style mb-2 flex items-center gap-1.5"><PenLine size={12} /> Подпись / Signature</p>
                          <div className="rounded-lg p-3 text-center relative" style={{ background: 'hsl(215 25% 22%)', border: '2px dashed hsl(215 22% 32%)', minHeight: '120px' }}>
                            {currentSigUrl ? (
                              <div className="relative inline-block">
                                <img src={currentSigUrl} alt="signature" className="max-h-24 max-w-full object-contain mx-auto" />
                                <button onClick={() => handleRemoveAsset(company.id, 'signature')} className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'hsl(0 72% 51%)', color: 'white' }}><X size={10} /></button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-20"><PenLine size={24} style={{ color: 'hsl(215 15% 40%)' }} /><p className="text-xs mt-1" style={{ color: 'hsl(215 15% 45%)' }}>Нет подписи</p></div>
                            )}
                          </div>
                          {currentSigUrl && (
                            <div className="mt-2 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs" style={{ color: 'hsl(215 15% 55%)' }}>Varsayılan boyut</span>
                                <span className="text-xs font-mono font-semibold" style={{ color: 'hsl(38 92% 60%)' }}>{Math.round(liveSigScale * 100)}%</span>
                              </div>
                              <input type="range" min="0.3" max="3" step="0.05"
                                value={liveSigScale}
                                onChange={e => {
                                  const v = parseFloat(e.target.value);
                                  setPreviewScales(p => ({ ...p, [company.id]: { stamp: p[company.id]?.stamp ?? (company.stampScale ?? 1), sig: v } }));
                                }}
                                onMouseUp={async e => {
                                  const v = parseFloat((e.target as HTMLInputElement).value);
                                  await updateForwarder(company.id, { signatureScale: v });
                                  await loadForwarders();
                                  toast.success('İmza boyutu kaydedildi');
                                }}
                                onTouchEnd={async e => {
                                  const v = parseFloat((e.target as HTMLInputElement).value);
                                  await updateForwarder(company.id, { signatureScale: v });
                                  await loadForwarders();
                                }}
                                className="w-full accent-amber-400" style={{ height: '4px' }}
                              />
                            </div>
                          )}
                          <input type="file" accept="image/*" className="hidden" ref={el => { sigRefs.current[company.id] = el; }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(company.id, 'signature', f); }} />
                          <button onClick={() => sigRefs.current[company.id]?.click()} className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded text-xs font-medium" style={{ background: 'hsl(215 25% 26%)', color: 'hsl(210 20% 80%)' }}><Upload size={12} /> {currentSigUrl ? 'Замените' : 'Yükle'} подпись</button>
                        </div>
                      </div>

                      {/* Live preview — mirrors contract signature block */}
                      {(currentStampUrl || currentSigUrl) && (
                        <div className="mt-4 rounded-xl overflow-hidden" style={{ border: '1px solid hsl(215 22% 30%)' }}>
                          <div className="px-3 py-1.5 flex items-center gap-1.5" style={{ background: 'hsl(215 28% 20%)', borderBottom: '1px solid hsl(215 22% 28%)' }}>
                            <Eye size={11} style={{ color: 'hsl(38 92% 55%)' }} />
                            <span className="text-xs font-medium" style={{ color: 'hsl(38 92% 55%)' }}>Canlı Önizleme — Sözleşmedeki görünüm</span>
                          </div>
                          <div style={{ background: 'white', padding: '16px 20px', fontFamily: "'Times New Roman', Georgia, serif", fontSize: '9pt', color: '#111', minHeight: '80px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
                              {/* Signature line + overlay */}
                              <div style={{ position: 'relative', minWidth: '200px' }}>
                                <div style={{ fontSize: '9pt', color: '#111' }}>
                                  Директор ______________________ {company.directorNameRu}
                                </div>
                                {currentSigUrl && (
                                  <img
                                    src={currentSigUrl}
                                    alt="signature"
                                    style={{
                                      position: 'absolute',
                                      bottom: '-4px',
                                      left: '70px',
                                      height: `${Math.round(40 * liveSigScale)}px`,
                                      width: 'auto',
                                      objectFit: 'contain',
                                    }}
                                  />
                                )}
                              </div>
                              {/* Stamp */}
                              {currentStampUrl && (
                                <img
                                  src={currentStampUrl}
                                  alt="stamp"
                                  style={{
                                    height: `${Math.round(80 * liveStampScale)}px`,
                                    width: `${Math.round(80 * liveStampScale)}px`,
                                    objectFit: 'contain',
                                    opacity: 0.85,
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pozisyon Ayarı butonu */}
                      <div className="mt-3">
                        <button
                          onClick={() => {
                            if (posEditId === company.id) {
                              setPosEditId(null);
                            } else {
                              setPosEditId(company.id);
                              setPosEditConfig(company.positionConfig || DEFAULT_POSITION_CONFIG);
                              setPosEditLang('1');
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={{ background: posEditId === company.id ? 'hsl(220 60% 32%)' : 'hsl(215 25% 24%)', color: posEditId === company.id ? 'hsl(220 80% 85%)' : 'hsl(210 20% 72%)', border: '1px solid hsl(215 22% 32%)' }}
                        >
                          <ZoomIn size={12} /> Mühür / İmza Pozisyon Ayarı
                          {posEditId === company.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>

                        {posEditId === company.id && (() => {
                          const lk = posEditLang;
                          const sp = posEditConfig.stamp?.[lk] || { x: 0, y: 0 };
                          const ip = posEditConfig.sig?.[lk] || { x: 0, y: 0 };
                          const updatePos = (type: 'stamp' | 'sig', axis: 'x' | 'y', val: number) => {
                            setPosEditConfig(prev => ({
                              ...prev,
                              [type]: { ...prev[type], [lk]: { ...(prev[type]?.[lk] || { x: 0, y: 0 }), [axis]: val } },
                            }));
                          };
                          const stmpH = Math.round(80 * (company.stampScale ?? 1));
                          const stmpW = Math.round(80 * (company.stampScale ?? 1));
                          const sigH = Math.round(40 * (company.signatureScale ?? 1));
                          const currentStampUrl2 = company.stampUrl || '';
                          const currentSigUrl2 = company.signatureUrl || '';
                          return (
                            <div className="mt-3 rounded-xl p-4 space-y-4" style={{ background: 'hsl(215 28% 16%)', border: '1px solid hsl(220 55% 38% / 0.5)' }}>
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold" style={{ color: 'hsl(220 80% 78%)' }}>Mühür &amp; İmza Pozisyonu</p>
                                <p className="text-xs" style={{ color: 'hsl(215 15% 48%)' }}>Dil sayısına göre ayrı ayar</p>
                              </div>

                              {/* Language count selector */}
                              <div className="flex rounded-lg overflow-hidden" style={{ background: 'hsl(215 28% 20%)', border: '1px solid hsl(215 22% 28%)' }}>
                                {(['1', '2', '3'] as const).map(lc => (
                                  <button key={lc} onClick={() => setPosEditLang(lc)}
                                    className="flex-1 py-2 text-xs font-medium transition-all"
                                    style={{ background: posEditLang === lc ? 'hsl(220 60% 30%)' : 'transparent', color: posEditLang === lc ? 'hsl(220 80% 85%)' : 'hsl(215 15% 50%)', borderBottom: posEditLang === lc ? '2px solid hsl(220 80% 65%)' : '2px solid transparent' }}
                                  >
                                    {lc} Dil
                                  </button>
                                ))}
                              </div>

                              {/* Stamp position sliders */}
                              <div className="space-y-2 p-3 rounded-lg" style={{ background: 'hsl(215 25% 20%)', border: '1px solid hsl(215 22% 28%)' }}>
                                <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'hsl(38 92% 55%)' }}><Stamp size={11} /> Mühür Pozisyonu (X / Y offset px)</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-xs" style={{ color: 'hsl(215 15% 60%)' }}>↔ Yatay (X)</label>
                                      <span className="text-xs font-mono" style={{ color: 'hsl(38 92% 60%)' }}>{sp.x}px</span>
                                    </div>
                                    <input type="range" min="-200" max="200" step="1" value={sp.x}
                                      onChange={e => updatePos('stamp', 'x', parseInt(e.target.value))}
                                      className="w-full accent-amber-400" style={{ height: '4px' }} />
                                    <div className="flex justify-between text-xs mt-0.5" style={{ color: 'hsl(215 15% 40%)' }}><span>-200</span><span>0</span><span>+200</span></div>
                                  </div>
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-xs" style={{ color: 'hsl(215 15% 60%)' }}>↕ Dikey (Y)</label>
                                      <span className="text-xs font-mono" style={{ color: 'hsl(38 92% 60%)' }}>{sp.y}px</span>
                                    </div>
                                    <input type="range" min="-200" max="200" step="1" value={sp.y}
                                      onChange={e => updatePos('stamp', 'y', parseInt(e.target.value))}
                                      className="w-full accent-amber-400" style={{ height: '4px' }} />
                                    <div className="flex justify-between text-xs mt-0.5" style={{ color: 'hsl(215 15% 40%)' }}><span>-200</span><span>0</span><span>+200</span></div>
                                  </div>
                                </div>
                                <div className="flex gap-3">
                                  <input type="number" min="-200" max="200" value={sp.x}
                                    onChange={e => updatePos('stamp', 'x', parseInt(e.target.value) || 0)}
                                    className="form-input-style w-full text-center" style={{ maxWidth: '90px' }} />
                                  <input type="number" min="-200" max="200" value={sp.y}
                                    onChange={e => updatePos('stamp', 'y', parseInt(e.target.value) || 0)}
                                    className="form-input-style w-full text-center" style={{ maxWidth: '90px' }} />
                                  <button onClick={() => { updatePos('stamp', 'x', 0); updatePos('stamp', 'y', 0); }} className="px-2 py-1 rounded text-xs" style={{ background: 'hsl(215 25% 28%)', color: 'hsl(215 15% 60%)' }}>Sıfırla</button>
                                </div>
                              </div>

                              {/* Signature position sliders */}
                              <div className="space-y-2 p-3 rounded-lg" style={{ background: 'hsl(215 25% 20%)', border: '1px solid hsl(215 22% 28%)' }}>
                                <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'hsl(200 70% 65%)' }}><PenLine size={11} /> İmza Pozisyonu (X / Y offset px)</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-xs" style={{ color: 'hsl(215 15% 60%)' }}>↔ Yatay (X)</label>
                                      <span className="text-xs font-mono" style={{ color: 'hsl(200 70% 65%)' }}>{ip.x}px</span>
                                    </div>
                                    <input type="range" min="-200" max="200" step="1" value={ip.x}
                                      onChange={e => updatePos('sig', 'x', parseInt(e.target.value))}
                                      className="w-full" style={{ height: '4px', accentColor: 'hsl(200 70% 55%)' }} />
                                    <div className="flex justify-between text-xs mt-0.5" style={{ color: 'hsl(215 15% 40%)' }}><span>-200</span><span>0</span><span>+200</span></div>
                                  </div>
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-xs" style={{ color: 'hsl(215 15% 60%)' }}>↕ Dikey (Y)</label>
                                      <span className="text-xs font-mono" style={{ color: 'hsl(200 70% 65%)' }}>{ip.y}px</span>
                                    </div>
                                    <input type="range" min="-200" max="200" step="1" value={ip.y}
                                      onChange={e => updatePos('sig', 'y', parseInt(e.target.value))}
                                      className="w-full" style={{ height: '4px', accentColor: 'hsl(200 70% 55%)' }} />
                                    <div className="flex justify-between text-xs mt-0.5" style={{ color: 'hsl(215 15% 40%)' }}><span>-200</span><span>0</span><span>+200</span></div>
                                  </div>
                                </div>
                                <div className="flex gap-3">
                                  <input type="number" min="-200" max="200" value={ip.x}
                                    onChange={e => updatePos('sig', 'x', parseInt(e.target.value) || 0)}
                                    className="form-input-style w-full text-center" style={{ maxWidth: '90px' }} />
                                  <input type="number" min="-200" max="200" value={ip.y}
                                    onChange={e => updatePos('sig', 'y', parseInt(e.target.value) || 0)}
                                    className="form-input-style w-full text-center" style={{ maxWidth: '90px' }} />
                                  <button onClick={() => { updatePos('sig', 'x', 0); updatePos('sig', 'y', 0); }} className="px-2 py-1 rounded text-xs" style={{ background: 'hsl(215 25% 28%)', color: 'hsl(215 15% 60%)' }}>Sıfırla</button>
                                </div>
                              </div>

                              {/* Live mini preview */}
                              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid hsl(215 22% 30%)' }}>
                                <div className="px-3 py-1.5 flex items-center gap-1.5" style={{ background: 'hsl(215 28% 20%)', borderBottom: '1px solid hsl(215 22% 28%)' }}>
                                  <Eye size={11} style={{ color: 'hsl(38 92% 55%)' }} />
                                  <span className="text-xs font-medium" style={{ color: 'hsl(38 92% 55%)' }}>Canlı Önizleme — {lk} dil</span>
                                </div>
                                <div style={{ background: 'white', padding: '20px', fontFamily: "'Times New Roman', serif", fontSize: '9pt', color: '#111', position: 'relative', minHeight: `${stmpH + 60}px` }}>
                                  <div style={{ position: 'relative', minHeight: `${stmpH + 20}px` }}>
                                    <div>Директор ______________________ {company.directorNameRu}</div>
                                    {currentSigUrl2 && (
                                      <img src={currentSigUrl2} alt="sig" style={{ position: 'absolute', top: `${-10 + ip.y}px`, left: `${60 + ip.x}px`, height: `${sigH}px`, width: 'auto', objectFit: 'contain', zIndex: 10 }} />
                                    )}
                                    {currentStampUrl2 && (
                                      <img src={currentStampUrl2} alt="stamp" style={{ position: 'absolute', top: `${-stmpH / 2 + sp.y}px`, left: `${sp.x}px`, height: `${stmpH}px`, width: `${stmpW}px`, objectFit: 'contain', opacity: 0.85, zIndex: 10 }} />
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Save / Cancel */}
                              <div className="flex gap-2">
                                <button onClick={() => handleSavePosConfig(company.id)} disabled={savingPosConfig} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50" style={{ background: 'hsl(142 60% 28%)', color: 'white' }}>
                                  {savingPosConfig ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : <Check size={12} />} Kaydet
                                </button>
                                <button onClick={() => setPosEditId(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium" style={{ background: 'hsl(215 25% 25%)', color: 'hsl(210 20% 75%)' }}><X size={12} /> İptal</button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Cloud badge */}
                      {(company.stampUrl || company.signatureUrl) && (
                        <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: 'hsl(142 60% 55%)' }}>
                          <Globe size={11} />
                          <span>Supabase Storage'a kaydedildi — tüm cihazlarda görünür</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
