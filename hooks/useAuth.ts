import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager';
  companyId?: string;
}

const ADMIN_CREDENTIALS = {
  email: 'osmandemir@gmail.com',
  password: '1234',
  user: {
    id: 'admin',
    name: 'Осман Демир (Admin)',
    email: 'osmandemir@gmail.com',
    role: 'admin' as const,
    companyId: 'logitrans_uz',
  },
};

const SESSION_KEY = 'logitrans_session';

function readSession(): AuthUser | null {
  const saved = localStorage.getItem(SESSION_KEY);
  return saved ? JSON.parse(saved) : null;
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(readSession);

  // Sync across hook instances via storage events
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) {
        setCurrentUser(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };
    const onCustom = () => setCurrentUser(readSession());
    window.addEventListener('storage', onStorage);
    window.addEventListener('logitrans_auth_change', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('logitrans_auth_change', onCustom);
    };
  }, []);

  const loginAsAdmin = useCallback((email: string, password: string): boolean => {
    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
      const user = ADMIN_CREDENTIALS.user;
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      setCurrentUser(user);
      window.dispatchEvent(new Event('logitrans_auth_change'));
      return true;
    }
    return false;
  }, []);

  const loginAsManager = useCallback(async (managerId: string, password?: string): Promise<boolean> => {
    const managers = await getStoredManagers();
    const manager = managers.find(m => m.id === managerId);
    if (manager) {
      // If manager has a password set, verify it
      if (manager.password && manager.password.trim() !== '') {
        if (!password || password !== manager.password) {
          return false;
        }
      }
      const user: AuthUser = {
        id: manager.id,
        name: manager.name,
        email: manager.email || '',
        role: 'manager',
        companyId: manager.company_id,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      setCurrentUser(user);
      window.dispatchEvent(new Event('logitrans_auth_change'));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
    window.dispatchEvent(new Event('logitrans_auth_change'));
  }, []);

  return { currentUser, loginAsAdmin, loginAsManager, logout };
}

export interface ExtraSheet {
  spreadsheet_id: string;
  sheet_name: string;
}

export interface StoredManager {
  id: string;
  name: string;
  email: string;
  company_id: string;
  /** @deprecated use company_id */
  companyId?: string;
  created_at: string;
  password?: string;
  is_pinned?: boolean;
  extra_sheets?: ExtraSheet[];
}

/** Fetch managers from Supabase (with localStorage fallback migration) */
export async function getStoredManagers(): Promise<StoredManager[]> {
  // Migrate from localStorage if data exists there
  const localKey = 'logitrans_managers_list';
  const localRaw = localStorage.getItem(localKey);
  if (localRaw) {
    const localManagers: any[] = JSON.parse(localRaw);
    if (localManagers.length > 0) {
      // Migrate to Supabase
      for (const m of localManagers) {
        const migrated: StoredManager = {
          id: m.id,
          name: m.name,
          email: m.email || '',
          company_id: m.companyId || m.company_id || 'logitrans_uz',
          created_at: m.createdAt || m.created_at || new Date().toISOString(),
          password: m.password || '',
        };
        await supabase
          .from('logitrans_managers')
          .upsert(migrated, { onConflict: 'id' });
      }
      // Clear localStorage after migration
      localStorage.removeItem(localKey);
      console.log('[useAuth] Migrated', localManagers.length, 'managers to Supabase');
    }
  }

  const { data, error } = await supabase
    .from('logitrans_managers')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[useAuth] Failed to fetch managers:', error.message);
    return [];
  }
  // Add companyId alias for backward compat
  return (data || []).map(m => ({ ...m, companyId: m.company_id, is_pinned: m.is_pinned ?? false, extra_sheets: m.extra_sheets || [] }));
}

export async function saveManager(
  manager: { name: string; email: string; companyId: string; password?: string; extra_sheets?: ExtraSheet[] }
): Promise<StoredManager> {
  const newMgr: any = {
    id: `mgr_${Date.now()}`,
    name: manager.name,
    email: manager.email || '',
    company_id: manager.companyId,
    created_at: new Date().toISOString(),
    password: manager.password || '',
    extra_sheets: manager.extra_sheets || [],
  };
  const { data, error } = await supabase
    .from('logitrans_managers')
    .insert(newMgr)
    .select()
    .single();

  if (error) throw new Error('Manager kaydedilemedi: ' + error.message);
  return { ...data, companyId: data.company_id };
}

export async function deleteManager(id: string): Promise<void> {
  const { error } = await supabase
    .from('logitrans_managers')
    .delete()
    .eq('id', id);
  if (error) throw new Error('Manager silinemedi: ' + error.message);
}

export async function updateManager(id: string, data: Partial<StoredManager>): Promise<void> {
  const updateData: any = { ...data };
  if (data.companyId) {
    updateData.company_id = data.companyId;
    delete updateData.companyId;
  }
  const { error } = await supabase
    .from('logitrans_managers')
    .update(updateData)
    .eq('id', id);
  if (error) throw new Error('Manager güncellenemedi: ' + error.message);
}
