import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ContractFormData, FlatClauseItem, ClientInfo, SavedContract, ContractLanguage } from '@/types/contract';
import { COMPANIES } from '@/constants/companies';
import { getStoredManagers } from '@/hooks/useAuth';
import { getActiveForwarders, Forwarder } from '@/lib/forwardersApi';
import { generateFlatClauses } from '@/constants/clauses';
import { getMasterTemplate } from '@/lib/templateApi';
import {
  generateContractNumber,
  peekNextContractNumber,
  peekNextContractNumberSync,
  updateCounterCache,
} from '@/lib/contractNumber';

const DEFAULT_CLIENT: ClientInfo = {
  companyName: '',
  country: '',
  city: '',
  address: '',
  sector: '',
  email: '',
  mobilePhone: '',
  officePhone: '',
  currency: 'USD',
  account: '',
  bin: '',
  director: '',
  bankName: '',
  swift: '',
  contractDate: new Date().toISOString().split('T')[0],
  contractNumber: '',
  contractAmount: '',
};

export function useContract(currentUserId?: string) {
  const [expeditorId, setExpeditorId] = useState<string>('logitrans_uz');
  const [managerId, setManagerId] = useState<string>('');
  const [forwarders, setForwarders] = useState<Forwarder[]>([]);
  const committedNumberRef = useRef<string | null>(null);
  const [managers, setManagers] = useState<any[]>([]);

  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    ...DEFAULT_CLIENT,
    contractNumber: peekNextContractNumberSync('logitrans_uz'),
  });
  const [clauses, setClauses] = useState<FlatClauseItem[]>(() =>
    generateFlatClauses('USD', '')
  );
  const [includeStamp, setIncludeStamp] = useState(false);
  const [includeSignature, setIncludeSignature] = useState(false);
  const [stampScale, setStampScale] = useState(1.0);
  const [signatureScale, setSignatureScale] = useState(1.0);
  const [languages, setLanguages] = useState<ContractLanguage[]>(['ru', 'en']);

  useEffect(() => {
    getStoredManagers().then(list => setManagers(list));
    getActiveForwarders().then(list => {
      setForwarders(list);
      // Set default forwarder as initial expeditorId if available
      const def = list.find(f => f.isDefault);
      if (def && !committedNumberRef.current) {
        setExpeditorId(def.id);
        // Apply default scales from forwarder DB record
        if (def.stampScale) setStampScale(def.stampScale);
        if (def.signatureScale) setSignatureScale(def.signatureScale);
      }
    }).catch(e => console.warn('[useContract] forwarders load failed:', e?.message));
  }, []);

  // Load master template on mount
  useEffect(() => {
    getMasterTemplate().then(templateClauses => {
      if (!templateClauses) return;
      if (committedNumberRef.current) return;
      setClauses(templateClauses);
    }).catch(e => console.warn('[useContract] template load failed:', e?.message));
  }, []);

  // Update contract number from Supabase counter
  useEffect(() => {
    let cancelled = false;
    peekNextContractNumber('logitrans_uz')
      .then(num => {
        if (cancelled) return;
        setClientInfo(prev => {
          if (committedNumberRef.current) return prev;
          return { ...prev, contractNumber: num };
        });
        const match = num.match(/(\d+)/);
        if (match) updateCounterCache('logitrans_uz', parseInt(match[1], 10) - 1);
      })
      .catch(e => console.warn('[useContract] mount peekNextContractNumber failed:', e?.message || e));
    return () => { cancelled = true; };
  }, []);

  const currentCompany = COMPANIES.find(c => c.id === expeditorId) || COMPANIES[0];
  const currentForwarder = forwarders.find(f => f.id === expeditorId) || null;

  const availableManagers = managers
    .filter(m => {
      if (currentUserId === 'admin') return true;
      const isPinned = m.is_pinned === true;
      const isCurrentUser = currentUserId && m.id === currentUserId;
      return isPinned || isCurrentUser;
    })
    .map(m => ({ id: m.id, name: m.name, companyId: m.company_id || m.companyId }));

  const handleExpeditorChange = useCallback(async (id: string) => {
    setExpeditorId(id);
    setManagerId('');
    const syncNum = peekNextContractNumberSync(id);
    setClientInfo(prev => {
      if (committedNumberRef.current) return prev;
      const newCurrency = (id === 'logitrans_uz' && prev.country === 'Узбекистан')
        ? 'UZS' : prev.currency;
      return { ...prev, contractNumber: syncNum, currency: newCurrency };
    });
    peekNextContractNumber(id)
      .then(nextNum => {
        setClientInfo(prev => {
          if (committedNumberRef.current) return prev;
          return { ...prev, contractNumber: nextNum };
        });
      })
      .catch(e => console.warn('[useContract] handleExpeditorChange peek failed:', e?.message || e));
  }, []);

  const handleClientChange = useCallback((field: keyof ClientInfo, value: string) => {
    setClientInfo(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'country' && value === 'Узбекистан' && expeditorId === 'logitrans_uz') {
        updated.currency = 'UZS';
      }
      // Update currency/amount in clause 4.1 and 4.2
      if (field === 'contractAmount' || field === 'currency' || (field === 'country' && value === 'Узбекистан')) {
        const newAmount = field === 'contractAmount' ? value : prev.contractAmount;
        const newCurrency = field === 'currency' ? value
          : (field === 'country' && value === 'Узбекистан' && expeditorId === 'logitrans_uz') ? 'UZS'
          : prev.currency;
        const freshAll = generateFlatClauses(newCurrency, newAmount);
        const fresh41 = freshAll.find(g => g.id === 's4_1');
        const fresh42 = freshAll.find(g => g.id === 's4_2');
        setClauses(prevClauses => prevClauses.map(cl => {
          if (cl.id === 's4_1' && fresh41) return { ...cl, contentRu: fresh41.contentRu, contentEn: fresh41.contentEn, contentTr: fresh41.contentTr };
          if (cl.id === 's4_2' && fresh42) return { ...cl, contentRu: fresh42.contentRu, contentEn: fresh42.contentEn, contentTr: fresh42.contentTr };
          return cl;
        }));
      }
      return updated;
    });
  }, [expeditorId]);

  const toggleClause = useCallback((id: string) => {
    setClauses(prev => prev.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
  }, []);

  const updateClauseContent = useCallback((id: string, field: 'contentRu' | 'contentEn' | 'contentTr', value: string) => {
    setClauses(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  }, []);

  const addCustomClause = useCallback(() => {
    const maxSort = Math.max(0, ...clauses.map(c => c.sortOrder));
    const newClause: FlatClauseItem = {
      id: `custom_${Date.now()}`,
      itemNumber: `${clauses.length + 1}.`,
      contentRu: '',
      contentEn: '',
      contentTr: '',
      isActive: true,
      sortOrder: maxSort + 1,
      isHeader: false,
    };
    setClauses(prev => [...prev, newClause]);
  }, [clauses.length]);

  const removeClause = useCallback((id: string) => {
    setClauses(prev => prev.filter(c => c.id !== id));
  }, []);

  const getFormData = (): ContractFormData => ({
    expeditorId,
    managerId,
    clientInfo,
    clauses,
    includeStamp,
    includeSignature,
    stampScale,
    signatureScale,
    languages,
  });

  const saveToLocal = (lockedNumber?: string): SavedContract => {
    const finalNumber = lockedNumber || committedNumberRef.current || clientInfo.contractNumber || `DRAFT-${Date.now()}`;
    const saved: SavedContract = {
      id: Date.now().toString(),
      contractNumber: finalNumber,
      clientName: clientInfo.companyName || 'Unknown Client',
      expeditorId,
      createdAt: new Date().toISOString(),
      status: 'draft',
      formData: { ...getFormData(), clientInfo: { ...clientInfo, contractNumber: finalNumber } },
      savedBy: currentUserId,
    };
    const existing = JSON.parse(localStorage.getItem('logitrans_contracts') || '[]') as SavedContract[];
    const updated = [saved, ...existing.filter(c => c.id !== saved.id)];
    localStorage.setItem('logitrans_contracts', JSON.stringify(updated));
    return saved;
  };

  const saveToLocalAsync = async (): Promise<SavedContract> => {
    let finalNumber: string;
    if (committedNumberRef.current) {
      finalNumber = committedNumberRef.current;
    } else {
      finalNumber = await generateContractNumber(expeditorId);
      committedNumberRef.current = finalNumber;
      setClientInfo(prev => ({ ...prev, contractNumber: finalNumber }));
    }
    return saveToLocal(finalNumber);
  };

  const loadContract = useCallback((saved: SavedContract) => {
    setExpeditorId(saved.formData.expeditorId);
    setManagerId(saved.formData.managerId);
    setClientInfo(saved.formData.clientInfo);
    // Support legacy ContractClause[] drafts by migrating to flat items
    const loadedClauses = saved.formData.clauses;
    if (loadedClauses && Array.isArray(loadedClauses) && loadedClauses.length > 0) {
      const first = loadedClauses[0] as any;
      if ('titleRu' in first) {
        // Legacy format — load fresh flat clauses instead
        const currency = saved.formData.clientInfo.currency || 'USD';
        const amount = saved.formData.clientInfo.contractAmount || '';
        setClauses(generateFlatClauses(currency, amount));
      } else {
        setClauses(loadedClauses as FlatClauseItem[]);
      }
    } else {
      setClauses(generateFlatClauses('USD', ''));
    }
    setIncludeStamp(saved.formData.includeStamp);
    setIncludeSignature(saved.formData.includeSignature);
    setStampScale(saved.formData.stampScale ?? 1.0);
    setSignatureScale(saved.formData.signatureScale ?? 1.0);
    setLanguages(saved.formData.languages || ['ru', 'en']);
    committedNumberRef.current = saved.formData.clientInfo.contractNumber || null;
  }, []);

  const resetForNewContract = useCallback(() => {
    committedNumberRef.current = null;
    setExpeditorId('logitrans_uz');
    setManagerId('');
    const syncNum = peekNextContractNumberSync('logitrans_uz');
    setClientInfo({
      ...DEFAULT_CLIENT,
      contractNumber: syncNum,
      contractDate: new Date().toISOString().split('T')[0],
    });
    getMasterTemplate()
      .then(templateClauses => {
        setClauses(templateClauses || generateFlatClauses('USD', ''));
      })
      .catch(() => setClauses(generateFlatClauses('USD', '')));
    setIncludeStamp(false);
    setIncludeSignature(false);
    setStampScale(1.0);
    setSignatureScale(1.0);
    setLanguages(['ru', 'en']);
    peekNextContractNumber('logitrans_uz')
      .then(nextNum => {
        setClientInfo(prev => {
          if (committedNumberRef.current) return prev;
          return { ...prev, contractNumber: nextNum };
        });
      })
      .catch(e => console.warn('[useContract] resetForNewContract async peek failed:', e?.message || e));
  }, []);

  return {
    expeditorId,
    managerId,
    clientInfo,
    clauses,
    includeStamp,
    includeSignature,
    currentCompany,
    currentForwarder,
    forwarders,
    availableManagers,
    languages,
    setLanguages,
    setManagerId,
    setIncludeStamp,
    setIncludeSignature,
    stampScale,
    signatureScale,
    setStampScale,
    setSignatureScale,
    handleExpeditorChange,
    handleClientChange,
    toggleClause,
    updateClauseContent,
    addCustomClause,
    removeClause,
    getFormData,
    saveToLocal,
    saveToLocalAsync,
    loadContract,
    resetForNewContract,
  };
}
