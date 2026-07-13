
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { COMPANIES } from '@/constants/companies';
import { useNavigate } from 'react-router-dom';
import {
  Archive, FileText, Trash2, Calendar, Building, ChevronRight,
  Loader2, Search, CheckCircle2, Edit3, ExternalLink, RefreshCw,
  History, Clock, PenLine, X, Users, Lock, FilePlus, FileCheck, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth, getStoredManagers, StoredManager } from '@/hooks/useAuth';
import { getDrafts, deleteDraft, updateDraftStatus, Draft, addSupplementaryAgreement, removeSupplementaryAgreement, SupplementaryAgreement, cleanupExpiredDrafts, DRAFT_EXPIRE_DAYS } from '@/lib/draftsApi';
import { deleteContractFromSheet } from '@/lib/sheetsApi';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type StatusFilter = 'all' | 'draft' | 'pending' | 'signed';
type DraftStatus = 'draft' | 'pending' | 'signed';

/** LocalStorage key for last archive visit timestamp (per user) */
function getLastVisitKey(userId: string) {
  return `logitrans_archive_last_visit_${userId}`;
}

/** Calculate days remaining before auto-deletion (only for draft status) */
function getDaysRemaining(draft: Draft): number | null {
  if (draft.status !== 'draft') return null;
  const createdAt = draft.createdAt || createdAtFromId(draft.id);
  if (!createdAt) return null;
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const daysPassed = Math.floor((now - created) / (1000 * 60 * 60 * 24));
  return Math.max(0, DRAFT_EXPIRE_DAYS - daysPassed);
}

/** Returns whether a draft was newly assigned to this user since their last visit */
function isNewlyAssigned(draft: Draft, currentUserId: string, lastVisitTs: number): boolean {
  if (draft.managerId !== currentUserId) return false;
  if (draft.createdBy === currentUserId) return false; // own draft, not assigned
  const updatedMs = draft.updatedAt ? new Date(draft.updatedAt).getTime() : 0;
  return updatedMs > lastVisitTs;
}

async function uploadDopPdf(
  file: File,
  draftId: string,
  dopNumber: number
): Promise<string> {
  const ext = file.name.split('.').pop() || 'pdf';
  const path = `dopsogl/${draftId}/dop${dopNumber}.${ext}`;
  const { error } = await supabase.storage
    .from('contract-pdfs')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error('Yükleme hatası: ' + error.message);
  const { data: urlData } = supabase.storage.from('contract-pdfs').getPublicUrl(path);
  return urlData.publicUrl;
}

async function deleteStoragePdf(pdfLink?: string): Promise<void> {
  if (!pdfLink) return;
  try {
    const marker = '/contract-pdfs/';
    const idx = pdfLink.indexOf(marker);
    if (idx === -1) return;
    const storagePath = pdfLink.substring(idx + marker.length);
    const { error } = await supabase.storage.from('contract-pdfs').remove([storagePath]);
    if (error) console.warn('[Storage] PDF silinemedi:', error.message);
    else console.log('[Storage] PDF silindi:', storagePath);
  } catch (e) {
    console.warn('[Storage] PDF silme hatası:', e);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Extract creation timestamp from draft ID like 'draft_1748851234567' */
function createdAtFromId(id: string): string | undefined {
  const m = id.match(/(\d{13})/);
  if (!m) return undefined;
  const ts = parseInt(m[1]);
  if (isNaN(ts)) return undefined;
  return new Date(ts).toISOString();
}

// ── HistoryPopover ─────────────────────────────────────────────────────────────

interface HistoryPopoverProps {
  draft: Draft;
  onClose: () => void;
}

const HistoryPopover: React.FC<HistoryPopoverProps> = ({ draft, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const createdAt = draft.createdAt || createdAtFromId(draft.id);
  const updatedAt = draft.updatedAt;
  const signedAt = (draft as any).signedAt;

  const events: { icon: React.ReactNode; label: string; date?: string; active: boolean; color: string }[] = [
    {
      icon: <FileText size={11} />,
      label: 'Создан',
      date: createdAt,
      active: true,
      color: 'hsl(220 70% 60%)',
    },
    {
      icon: <Clock size={11} />,
      label: 'Обновлён',
      date: updatedAt !== createdAt ? updatedAt : undefined,
      active: true,
      color: 'hsl(38 92% 55%)',
    },
    {
      icon: <PenLine size={11} />,
      label: 'Подписан',
      date: signedAt,
      active: draft.status === 'signed',
      color: 'hsl(142 60% 50%)',
    },
  ];

  return (
    <div
      ref={ref}
      className="absolute z-50 right-0 mt-1 rounded-xl shadow-2xl overflow-hidden"
      style={{
        top: '100%',
        minWidth: '240px',
        background: 'hsl(215 28% 16%)',
        border: '1px solid hsl(215 22% 28%)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid hsl(215 22% 24%)', background: 'hsl(215 28% 19%)' }}
      >
        <div className="flex items-center gap-1.5">
          <History size={12} style={{ color: 'hsl(38 92% 50%)' }} />
          <span className="text-xs font-semibold" style={{ color: 'hsl(210 20% 86%)' }}>
            {draft.contractNumber || 'Черновик'}
          </span>
        </div>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-white/10 transition-all" style={{ color: 'hsl(215 15% 55%)' }}>
          <X size={12} />
        </button>
      </div>

      {/* Timeline */}
      <div className="px-3 py-3 space-y-0">
        {events.map((ev, idx) => {
          const isLast = idx === events.length - 1;
          return (
            <div key={idx} className="flex gap-3">
              {/* Icon + line */}
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: '20px' }}>
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{
                    width: '20px',
                    height: '20px',
                    background: ev.active ? `${ev.color}22` : 'hsl(215 25% 24%)',
                    border: `1.5px solid ${ev.active ? ev.color : 'hsl(215 22% 32%)'}`,
                    color: ev.active ? ev.color : 'hsl(215 15% 40%)',
                  }}
                >
                  {ev.icon}
                </div>
                {!isLast && (
                  <div
                    style={{
                      width: '1.5px',
                      flexGrow: 1,
                      minHeight: '16px',
                      background: ev.active ? `${ev.color}40` : 'hsl(215 22% 28%)',
                      margin: '2px 0',
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="pb-3 flex-1 min-w-0">
                <p
                  className="text-xs font-medium leading-5"
                  style={{ color: ev.active ? 'hsl(210 20% 86%)' : 'hsl(215 15% 40%)' }}
                >
                  {ev.label}
                </p>
                {ev.date ? (
                  <p className="text-xs" style={{ color: 'hsl(215 15% 52%)' }}>
                    {formatDate(ev.date)}
                  </p>
                ) : (
                  <p className="text-xs" style={{ color: 'hsl(215 15% 35%)', fontStyle: 'italic' }}>
                    {ev.active ? 'Дата недоступна' : 'Не подписан'}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer — contract date from formData if available */}
      {draft.formData?.clientInfo?.contractDate && (
        <div
          className="px-3 py-2 flex items-center gap-1.5"
          style={{ borderTop: '1px solid hsl(215 22% 24%)', background: 'hsl(215 28% 19%)' }}
        >
          <Calendar size={10} style={{ color: 'hsl(215 15% 48%)' }} />
          <span className="text-xs" style={{ color: 'hsl(215 15% 50%)' }}>
            Дата договора: {draft.formData.clientInfo.contractDate}
          </span>
        </div>
      )}
    </div>
  );
};

// ── SavedContracts ─────────────────────────────────────────────────────────────

const SavedContracts: React.FC = () => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [historyOpenId, setHistoryOpenId] = useState<string | null>(null);
  const [dopOpenId, setDopOpenId] = useState<string | null>(null);
  const [uploadingDopFor, setUploadingDopFor] = useState<string | null>(null);
  const [removingDop, setRemovingDop] = useState<string | null>(null);
  const [statusEditOpenId, setStatusEditOpenId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [managerFilter, setManagerFilter] = useState<string>('all');
  const [allManagers, setAllManagers] = useState<StoredManager[]>([]);
  const [lastVisitTs, setLastVisitTs] = useState<number>(0);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Save current visit timestamp so next visit can detect new assignments
  useEffect(() => {
    if (!currentUser?.id) return;
    const key = getLastVisitKey(currentUser.id);
    const stored = parseInt(localStorage.getItem(key) || '0', 10);
    setLastVisitTs(stored);
    // Update timestamp after a short delay (after drafts are loaded and shown)
    const timer = setTimeout(() => {
      localStorage.setItem(key, Date.now().toString());
    }, 3000);
    return () => clearTimeout(timer);
  }, [currentUser?.id]);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    try {
      // Auto-cleanup expired drafts (>20 days, status='draft')
      await cleanupExpiredDrafts();
      const userId = currentUser?.role === 'manager' ? currentUser.id : undefined;
      const all = await getDrafts(userId);
      setDrafts(all);
    } catch (e: any) {
      console.error('[SavedContracts] loadDrafts error:', e?.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  // Load managers list for admin filter
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      getStoredManagers().then(list => setAllManagers(list));
    }
  }, [currentUser]);

  const handleChangeStatus = async (draft: Draft, newStatus: DraftStatus) => {
    setUpdatingStatusId(draft.id);
    setStatusEditOpenId(null);
    try {
      await updateDraftStatus(draft.id, newStatus);
      setDrafts(prev => prev.map(d =>
        d.id === draft.id ? { ...d, status: newStatus } : d
      ));
      const labels: Record<DraftStatus, string> = { draft: 'Черновик', pending: 'İmza Bekliyor', signed: 'Подписан' };
      toast.success(`Durum güncellendi → ${labels[newStatus]}`);
    } catch (err: any) {
      toast.error('Durum güncellenemedi: ' + err.message);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleUploadSupplementary = (draft: Draft) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploadingDopFor(draft.id);
      try {
        const existing = draft.supplementaryAgreements || [];
        const dopNumber = existing.length + 1;
        const url = await uploadDopPdf(file, draft.id, dopNumber);
        const agreement: SupplementaryAgreement = {
          url,
          name: `Доп${dopNumber}`,
          uploadedAt: new Date().toISOString(),
        };
        await addSupplementaryAgreement(draft.id, agreement);
        setDrafts(prev => prev.map(d =>
          d.id === draft.id
            ? { ...d, supplementaryAgreements: [...(d.supplementaryAgreements || []), agreement] }
            : d
        ));
        setDopOpenId(draft.id);
        toast.success(`Доп${dopNumber} yüklendi ve anlaşmaya eklendi`);
      } catch (err: any) {
        toast.error('Yükleme hatası: ' + err.message);
      } finally {
        setUploadingDopFor(null);
      }
    };
    input.click();
  };

  const handleRemoveDop = async (draft: Draft, idx: number) => {
    const key = `${draft.id}_${idx}`;
    setRemovingDop(key);
    try {
      await removeSupplementaryAgreement(draft.id, idx);
      setDrafts(prev => prev.map(d =>
        d.id === draft.id
          ? { ...d, supplementaryAgreements: (d.supplementaryAgreements || []).filter((_, i) => i !== idx) }
          : d
      ));
      toast.success('Ek anlaşma silindi');
    } catch (err: any) {
      toast.error('Silme hatası: ' + err.message);
    } finally {
      setRemovingDop(null);
    }
  };

  const handleOpenDraft = (draft: Draft) => {
    localStorage.setItem('logitrans_pending_load', JSON.stringify(draft));
    navigate('/');
  };

  const handleDelete = async (draft: Draft, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser?.role !== 'admin') {
      toast.error('Удаление доступно только администратору');
      return;
    }
    setDeletingId(draft.id);
    try {
      if (draft.contractNumber) {
        let extraSheets: import('@/lib/sheetsApi').ExtraSheet[] = [];
        // Use managerId first (assigned manager's sheets), fallback to createdBy
        const sheetOwnerId = draft.managerId || draft.createdBy;
        if (sheetOwnerId) {
          const { data: mgrRow } = await supabase
            .from('logitrans_managers')
            .select('extra_sheets')
            .eq('id', sheetOwnerId)
            .maybeSingle();
          if (mgrRow?.extra_sheets) {
            extraSheets = mgrRow.extra_sheets || [];
          }
        }
        console.log('[SavedContracts] Deleting from sheets, sheetOwnerId:', sheetOwnerId, 'extraSheets:', extraSheets.length);
        await deleteContractFromSheet(draft.contractNumber, extraSheets).catch(e =>
          console.warn('[SavedContracts] Sheets delete failed:', e?.message)
        );
      }
      if (draft.pdfUrl) {
        await deleteStoragePdf(draft.pdfUrl);
      }
      await deleteDraft(draft.id);
      setDrafts(prev => prev.filter(d => d.id !== draft.id));
      toast.success(`Договор ${draft.contractNumber || 'черновик'} удалён`);
    } catch (err: any) {
      console.error('[SavedContracts] Delete error:', err);
      toast.error('Ошибка удаления: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Filtering
  const filtered = drafts.filter(d => {
    const matchesSearch = !searchQuery.trim() ||
      d.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.contractNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'signed' && d.status === 'signed') ||
      (statusFilter === 'pending' && d.status === 'pending') ||
      (statusFilter === 'draft' && d.status !== 'signed' && d.status !== 'pending');
    const matchesManager =
      currentUser?.role !== 'admin' ||
      managerFilter === 'all' ||
      d.createdBy === managerFilter;
    return matchesSearch && matchesStatus && matchesManager;
  });

  const draftCount = drafts.filter(d => d.status !== 'signed' && d.status !== 'pending').length;
  const pendingCount = drafts.filter(d => d.status === 'pending').length;
  const signedCount = drafts.filter(d => d.status === 'signed').length;

  const getStatusBadge = (status: string) => {
    if (status === 'signed') return (
      <span
        className="text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
        style={{ background: 'hsl(142 65% 22%)', color: 'hsl(142 80% 72%)', border: '1px solid hsl(142 60% 38%)' }}
      >
        <CheckCircle2 size={10} /> Подписан
      </span>
    );
    if (status === 'pending') return (
      <span
        className="text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
        style={{ background: 'hsl(200 80% 20%)', color: 'hsl(200 90% 72%)', border: '1px solid hsl(200 70% 38%)' }}
      >
        ⏳ İmza Bekliyor
      </span>
    );
    return (
      <span
        className="text-xs px-1.5 py-0.5 rounded font-medium"
        style={{ background: 'hsl(38 92% 50% / 0.15)', color: 'hsl(38 92% 65%)' }}
      >
        черновик
      </span>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: 'hsl(215 28% 14%)' }}>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-lg"
              style={{ background: 'hsl(38 92% 50%)' }}
            >
              <Archive size={18} style={{ color: 'hsl(215 28% 12%)' }} />
            </div>
            <div>
              <h1 className="text-base font-bold" style={{ color: 'hsl(210 20% 92%)' }}>
                Архив договоров
              </h1>
              <p className="text-xs" style={{ color: 'hsl(215 15% 55%)' }}>
                {drafts.length} записей
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadDrafts}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all disabled:opacity-50"
              style={{ background: 'hsl(215 25% 22%)', color: 'hsl(210 20% 75%)' }}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Обновить</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium"
              style={{ background: 'hsl(220 70% 32%)', color: 'white' }}
            >
              <FileText size={14} /> Новый
            </button>
          </div>
        </div>

        {/* Manager Filter — admin only */}
        {currentUser?.role === 'admin' && allManagers.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5" style={{ color: 'hsl(215 15% 50%)' }}>
                <Users size={13} />
                <span className="text-xs font-medium">Manager:</span>
              </div>
              <button
                onClick={() => setManagerFilter('all')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: managerFilter === 'all' ? 'hsl(38 92% 50%)' : 'hsl(215 25% 22%)',
                  color: managerFilter === 'all' ? 'hsl(215 28% 12%)' : 'hsl(210 20% 72%)',
                  border: managerFilter === 'all' ? 'none' : '1px solid hsl(215 22% 28%)',
                }}
              >
                Tümü ({drafts.length})
              </button>
              {allManagers.map(mgr => {
                const count = drafts.filter(d => d.createdBy === mgr.id).length;
                const isActive = managerFilter === mgr.id;
                return (
                  <button
                    key={mgr.id}
                    onClick={() => setManagerFilter(isActive ? 'all' : mgr.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: isActive ? 'hsl(220 70% 38%)' : 'hsl(215 25% 22%)',
                      color: isActive ? 'white' : 'hsl(210 20% 72%)',
                      border: isActive ? 'none' : '1px solid hsl(215 22% 28%)',
                    }}
                  >
                    {mgr.name}
                    <span
                      className="px-1.5 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        background: isActive ? 'rgba(255,255,255,0.2)' : 'hsl(215 25% 28%)',
                        color: isActive ? 'white' : 'hsl(215 15% 60%)',
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search + Filter */}
        <div className="space-y-3 mb-6">
          {/* Search box */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'hsl(215 15% 48%)' }}
            />
            <input
              type="text"
              placeholder="Müşteri adı veya sözleşme numarası ile ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{
                background: 'hsl(215 28% 17%)',
                border: '1px solid hsl(215 22% 26%)',
                color: 'hsl(210 20% 88%)',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-1.5 py-0.5 rounded"
                style={{ color: 'hsl(215 15% 50%)', background: 'hsl(215 25% 24%)' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Status filter buttons — 4 categories */}
          <div className="flex gap-2 flex-wrap">
            {([
              { key: 'all', label: 'Tümü', count: drafts.length },
              { key: 'draft', label: 'Черновики', count: draftCount },
              { key: 'pending', label: 'İmza Bekleyenler', count: pendingCount },
              { key: 'signed', label: 'Подписаны', count: signedCount },
            ] as { key: StatusFilter; label: string; count: number }[]).map(btn => (
              <button
                key={btn.key}
                onClick={() => setStatusFilter(btn.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: statusFilter === btn.key
                    ? (btn.key === 'pending' ? 'hsl(200 80% 35%)' : btn.key === 'signed' ? 'hsl(142 60% 30%)' : 'hsl(38 92% 50%)')
                    : 'hsl(215 25% 22%)',
                  color: statusFilter === btn.key
                    ? (btn.key === 'pending' ? 'white' : btn.key === 'signed' ? 'white' : 'hsl(215 28% 12%)')
                    : 'hsl(210 20% 72%)',
                  border: statusFilter === btn.key ? 'none' : '1px solid hsl(215 22% 28%)',
                }}
              >
                {btn.key === 'pending' && '⏳ '}{btn.label}
                <span
                  className="px-1.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{
                    background: statusFilter === btn.key ? 'rgba(0,0,0,0.2)' : 'hsl(215 25% 28%)',
                    color: statusFilter === btn.key ? 'rgba(255,255,255,0.9)' : 'hsl(215 15% 60%)',
                  }}
                >
                  {btn.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div
            className="flex items-center justify-center py-14 rounded-xl"
            style={{ background: 'hsl(215 28% 17%)', border: '1px solid hsl(215 22% 24%)' }}
          >
            <Loader2 size={24} className="animate-spin" style={{ color: 'hsl(38 92% 50%)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="text-center py-16 rounded-xl"
            style={{ background: 'hsl(215 28% 17%)', border: '1px solid hsl(215 22% 24%)' }}
          >
            <Archive size={40} style={{ color: 'hsl(215 15% 40%)', margin: '0 auto 16px' }} />
            <p className="text-sm font-medium" style={{ color: 'hsl(215 15% 55%)' }}>
              {searchQuery || statusFilter !== 'all' ? 'Aramanızla eşleşen kayıt bulunamadı' : 'Нет сохранённых договоров'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <p className="text-xs mt-1" style={{ color: 'hsl(215 15% 40%)' }}>Создайте и сохраните первый договор</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(draft => {
              const company = COMPANIES.find(c => c.id === draft.expeditorId);
              const isSigned = draft.status === 'signed';
              const isPending = draft.status === 'pending';
              const isDeleting = deletingId === draft.id;
              const isHistoryOpen = historyOpenId === draft.id;
              const isNewAssignment = currentUser?.role === 'manager' && isNewlyAssigned(draft, currentUser.id, lastVisitTs);

              return (
                <div key={draft.id}>
                  {/* Manager cannot edit signed contracts */}
                  {(() => {
                    const isManagerViewOnly = isSigned && currentUser?.role === 'manager';
                    const isDopOpen = dopOpenId === draft.id;
                    const dops = draft.supplementaryAgreements || [];
                    return (
                      <div className="rounded-xl overflow-hidden" style={{
                        border: isNewAssignment
                          ? '1.5px solid hsl(38 92% 50%)'
                          : isPending
                          ? '1px solid hsl(200 60% 28%)'
                          : `1px solid ${isSigned ? 'hsl(142 40% 22%)' : 'hsl(215 22% 26%)'}`,
                        boxShadow: isNewAssignment ? '0 0 0 2px hsl(38 92% 50% / 0.18)' : isSigned ? '0 0 0 1px hsl(142 50% 18% / 0.5)' : isPending ? '0 0 0 1px hsl(200 60% 20% / 0.4)' : undefined,
                      }}>
                      <div
                        onClick={() => {
                          if (isManagerViewOnly) {
                            toast.error('İmzalı anlaşmalar yalnızca admin tarafından düzenlenebilir');
                            return;
                          }
                          setHistoryOpenId(null);
                          handleOpenDraft(draft);
                        }}
                        className={`p-4 flex items-center gap-3 transition-all ${isManagerViewOnly ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}`}
                        style={{
                          background: isNewAssignment
                            ? 'hsl(38 60% 14%)'
                            : isPending ? 'hsl(200 50% 10%)'
                            : isSigned ? 'hsl(142 30% 12%)' : 'hsl(215 28% 17%)',
                        }}
                      >
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0"
                          style={{ background: isSigned ? 'hsl(142 40% 18%)' : isPending ? 'hsl(200 60% 18%)' : 'hsl(215 25% 22%)' }}
                        >
                          {isSigned
                            ? <CheckCircle2 size={18} style={{ color: 'hsl(142 60% 50%)' }} />
                            : isPending
                            ? <span style={{ fontSize: '16px' }}>⏳</span>
                            : <Edit3 size={18} style={{ color: 'hsl(38 92% 50%)' }} />
                          }
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span
                              className="font-semibold text-sm"
                              style={{ color: isNewAssignment ? 'hsl(38 92% 70%)' : isPending ? 'hsl(200 80% 75%)' : isSigned ? 'hsl(142 30% 80%)' : 'hsl(210 20% 90%)' }}
                            >
                              {draft.contractNumber || 'Черновик'}
                            </span>
                            {getStatusBadge(draft.status || 'draft')}

                            {/* Days remaining badge for drafts */}
                            {(() => {
                              const days = getDaysRemaining(draft);
                              if (days === null) return null;
                              const isUrgent = days <= 5;
                              const isWarning = days <= 10;
                              return (
                                <span
                                  className="text-xs px-1.5 py-0.5 rounded font-medium flex items-center gap-1"
                                  style={{
                                    background: isUrgent
                                      ? 'hsl(0 70% 22%)'
                                      : isWarning
                                      ? 'hsl(25 85% 22%)'
                                      : 'hsl(40 70% 20%)',
                                    color: isUrgent
                                      ? 'hsl(0 80% 68%)'
                                      : isWarning
                                      ? 'hsl(25 90% 68%)'
                                      : 'hsl(40 80% 65%)',
                                    border: `1px solid ${isUrgent ? 'hsl(0 60% 32%)' : isWarning ? 'hsl(25 70% 32%)' : 'hsl(40 55% 28%)'}`,
                                  }}
                                >
                                  {isUrgent ? '⚠ ' : '🕐 '}{days === 0 ? 'Bugün silinir' : `${days} gün kaldı`}
                                </span>
                              );
                            })()}

                            {/* Admin: status change button */}
                            {currentUser?.role === 'admin' && (
                              <div className="relative">
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setStatusEditOpenId(statusEditOpenId === draft.id ? null : draft.id);
                                    setHistoryOpenId(null);
                                  }}
                                  disabled={updatingStatusId === draft.id}
                                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50"
                                  style={{
                                    background: statusEditOpenId === draft.id ? 'hsl(215 25% 32%)' : 'hsl(215 25% 24%)',
                                    color: 'hsl(215 15% 58%)',
                                    border: '1px solid hsl(215 22% 32%)'
                                  }}
                                  title="Durumu değiştir"
                                >
                                  {updatingStatusId === draft.id
                                    ? <span className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                                    : <span style={{ fontSize: '10px' }}>✎</span>}
                                </button>
                                {statusEditOpenId === draft.id && (
                                  <div
                                    className="absolute left-0 z-50 rounded-xl overflow-hidden shadow-2xl"
                                    style={{
                                      top: '100%',
                                      marginTop: '4px',
                                      minWidth: '160px',
                                      background: 'hsl(215 28% 16%)',
                                      border: '1px solid hsl(215 22% 28%)',
                                    }}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <div className="px-3 py-2" style={{ borderBottom: '1px solid hsl(215 22% 24%)', background: 'hsl(215 28% 19%)' }}>
                                      <span className="text-xs font-semibold" style={{ color: 'hsl(210 20% 75%)' }}>Durum değiştir</span>
                                    </div>
                                    {([
                                      { value: 'draft' as DraftStatus, label: 'Черновик', color: 'hsl(38 92% 50%)', bg: 'hsl(38 60% 18%)' },
                                      { value: 'pending' as DraftStatus, label: 'İmza Bekliyor', color: 'hsl(200 80% 65%)', bg: 'hsl(200 50% 14%)' },
                                      { value: 'signed' as DraftStatus, label: 'Подписан', color: 'hsl(142 70% 60%)', bg: 'hsl(142 40% 14%)' },
                                    ]).map(opt => (
                                      <button
                                        key={opt.value}
                                        onClick={() => handleChangeStatus(draft, opt.value)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-all hover:opacity-80"
                                        style={{
                                          background: draft.status === opt.value ? opt.bg : 'transparent',
                                          color: draft.status === opt.value ? opt.color : 'hsl(215 15% 62%)',
                                          borderLeft: draft.status === opt.value ? `3px solid ${opt.color}` : '3px solid transparent',
                                        }}
                                      >
                                        {draft.status === opt.value && <span>✓</span>}
                                        {opt.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {isNewAssignment && (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded font-medium animate-pulse"
                                style={{ background: 'hsl(38 92% 50% / 0.2)', color: 'hsl(38 92% 65%)' }}
                              >
                                ✦ Yeni atandı
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'hsl(215 15% 55%)' }}>
                            <span className="flex items-center gap-1">
                              <Building size={11} /> {draft.clientName || 'Без клиента'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar size={11} /> {new Date(draft.updatedAt).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: 'hsl(215 15% 42%)' }}>
                            {company?.nameRu || draft.expeditorId}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0 relative">
                          {/* Supplementary agreements button */}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setDopOpenId(dopOpenId === draft.id ? null : draft.id);
                              setHistoryOpenId(null);
                            }}
                            className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all hover:opacity-80"
                            style={{
                              background: dopOpenId === draft.id ? 'hsl(142 50% 22%)' : 'hsl(215 25% 24%)',
                              color: dopOpenId === draft.id ? 'hsl(142 75% 68%)' : 'hsl(215 15% 60%)',
                            }}
                            title="Ek Anlaşmalar / Доп. соглашения"
                          >
                            <FilePlus size={12} />
                            <span className="hidden sm:inline">Доп</span>
                            {(draft.supplementaryAgreements || []).length > 0 && (
                              <span className="px-1 rounded-full text-xs font-bold" style={{ background: 'hsl(142 60% 28%)', color: 'hsl(142 80% 72%)', fontSize: '9px' }}>
                                {(draft.supplementaryAgreements || []).length}
                              </span>
                            )}
                          </button>

                        {/* History button */}
                          <button
                            onClick={e => { e.stopPropagation(); setHistoryOpenId(isHistoryOpen ? null : draft.id); }}
                            className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all hover:opacity-80"
                            style={{
                              background: isHistoryOpen ? 'hsl(270 50% 35%)' : 'hsl(215 25% 24%)',
                              color: isHistoryOpen ? 'hsl(270 80% 85%)' : 'hsl(215 15% 60%)',
                            }}
                            title="Geçmiş / История"
                          >
                            <History size={12} />
                            <span className="hidden sm:inline">Geçmiş</span>
                          </button>

                          {isSigned ? (
                            draft.pdfUrl ? (
                              <a
                                href={draft.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-all hover:opacity-90"
                                style={{ background: 'hsl(142 55% 22%)', color: 'hsl(142 75% 68%)', border: '1px solid hsl(142 50% 32%)' }}
                                title="PDF dosyasını aç"
                              >
                                <ExternalLink size={11} />
                                <span>PDF İndir</span>
                              </a>
                            ) : (
                              <span
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium"
                                style={{ background: 'hsl(0 40% 18%)', color: 'hsl(0 60% 55%)', border: '1px solid hsl(0 40% 28%)' }}
                              >
                                PDF Yok
                              </span>
                            )
                          ) : (
                            draft.pdfUrl && (
                              <a
                                href={draft.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all hover:opacity-80"
                                style={{ background: 'hsl(200 60% 25%)', color: 'hsl(200 80% 70%)' }}
                                title="PDF dosyasını aç"
                              >
                                <ExternalLink size={11} />
                                <span className="hidden sm:inline">PDF</span>
                              </a>
                            )
                          )}
                          {currentUser?.role === 'admin' && (
                            <button
                              onClick={e => handleDelete(draft, e)}
                              disabled={isDeleting}
                              className="p-2 rounded transition-all hover:bg-red-900/30 disabled:opacity-40"
                              style={{ color: 'hsl(215 15% 50%)' }}
                              title="Удалить"
                            >
                              {isDeleting
                                ? <Loader2 size={15} className="animate-spin" />
                                : <Trash2 size={15} />
                              }
                            </button>
                          )}
                          {isSigned && currentUser?.role === 'manager'
                            ? <Lock size={15} style={{ color: 'hsl(142 60% 45%)', flexShrink: 0 }} />
                            : <ChevronRight size={16} style={{ color: 'hsl(215 15% 40%)' }} />
                          }

                          {/* History popover */}
                          {isHistoryOpen && (
                            <HistoryPopover
                              draft={draft}
                              onClose={() => setHistoryOpenId(null)}
                            />
                          )}
                        </div>
                      </div>

                      {/* Supplementary Agreements Panel */}
                      {isDopOpen && (
                        <div
                          onClick={e => e.stopPropagation()}
                          style={{ borderTop: `1px solid ${isSigned ? 'hsl(142 40% 22%)' : 'hsl(215 22% 26%)'}`, background: isSigned ? 'hsl(142 28% 10%)' : 'hsl(215 28% 15%)' }}
                        >
                          {/* Header */}
                          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid hsl(215 22% 22%)' }}>
                            <div className="flex items-center gap-2">
                              <FilePlus size={13} style={{ color: 'hsl(142 60% 55%)' }} />
                              <span className="text-xs font-semibold" style={{ color: 'hsl(142 70% 65%)' }}>
                                Дополнительные соглашения
                              </span>
                              {dops.length > 0 && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'hsl(142 60% 22%)', color: 'hsl(142 75% 65%)' }}>
                                  {dops.length}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleUploadSupplementary(draft)}
                              disabled={uploadingDopFor === draft.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                              style={{ background: 'hsl(142 55% 26%)', color: 'hsl(142 80% 78%)' }}
                            >
                              {uploadingDopFor === draft.id
                                ? <Loader2 size={11} className="animate-spin" />
                                : <FilePlus size={11} />}
                              {uploadingDopFor === draft.id ? 'Yükleniyor...' : `Доп${dops.length + 1} Yükle`}
                            </button>
                          </div>

                          {/* List */}
                          {dops.length === 0 ? (
                            <div className="flex items-center justify-center py-5">
                              <p className="text-xs" style={{ color: 'hsl(215 15% 45%)', fontStyle: 'italic' }}>
                                Henüz ek anlaşma eklenmemiş — yukarıdan yükleyebilirsiniz
                              </p>
                            </div>
                          ) : (
                            <div className="px-4 py-2.5 space-y-2">
                              {dops.map((dop, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-3 px-3 py-2 rounded-lg"
                                  style={{ background: 'hsl(215 28% 18%)', border: '1px solid hsl(142 40% 20%)' }}
                                >
                                  <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0" style={{ background: 'hsl(142 50% 18%)' }}>
                                    <FileCheck size={14} style={{ color: 'hsl(142 65% 55%)' }} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold" style={{ color: 'hsl(142 65% 72%)' }}>{dop.name}</p>
                                    <p className="text-xs" style={{ color: 'hsl(215 15% 48%)' }}>
                                      {new Date(dop.uploadedAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <a
                                      href={dop.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-all hover:opacity-90"
                                      style={{ background: 'hsl(142 50% 22%)', color: 'hsl(142 75% 70%)', border: '1px solid hsl(142 45% 30%)' }}
                                    >
                                      <ExternalLink size={10} />
                                      <span>Aç</span>
                                    </a>
                                    {currentUser?.role === 'admin' && (
                                      <button
                                        onClick={() => handleRemoveDop(draft, idx)}
                                        disabled={removingDop === `${draft.id}_${idx}`}
                                        className="p-1.5 rounded transition-all hover:bg-red-900/30 disabled:opacity-40"
                                        style={{ color: 'hsl(215 15% 50%)' }}
                                        title="Sil"
                                      >
                                        {removingDop === `${draft.id}_${idx}`
                                          ? <Loader2 size={12} className="animate-spin" />
                                          : <Trash2 size={12} />}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedContracts;
