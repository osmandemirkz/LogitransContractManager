import { createClient } from '@supabase/supabase-js';
import { FlatClauseItem } from '@/types/contract';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const TEMPLATE_ID = 'master_template';
const MAX_VERSIONS = 5;

export interface TemplateVersion {
  clauses: FlatClauseItem[];
  savedAt: string;
}

export interface MasterTemplate {
  clauses: FlatClauseItem[];
  updatedAt: string | null;
  versions: TemplateVersion[];
}

/** Fetch master template flat clauses from Supabase. Returns null if not set. */
export async function getMasterTemplate(): Promise<FlatClauseItem[] | null> {
  try {
    const { data, error } = await supabase
      .from('logitrans_templates')
      .select('clauses')
      .eq('id', TEMPLATE_ID)
      .maybeSingle();
    if (error) { console.warn('[templateApi] fetch error:', error.message); return null; }
    if (!data?.clauses || !Array.isArray(data.clauses) || data.clauses.length === 0) return null;
    // Detect legacy format (has titleRu field) → return null to force regeneration
    const first = data.clauses[0] as any;
    if (first && 'titleRu' in first) {
      console.warn('[templateApi] Legacy clause format detected, ignoring');
      return null;
    }
    return data.clauses as FlatClauseItem[];
  } catch (e: any) {
    console.warn('[templateApi] getMasterTemplate exception:', e?.message);
    return null;
  }
}

/** Fetch full template record including updated_at timestamp and version history. */
export async function getMasterTemplateFull(): Promise<MasterTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('logitrans_templates')
      .select('clauses, updated_at, versions')
      .eq('id', TEMPLATE_ID)
      .maybeSingle();
    if (error) { console.warn('[templateApi] fetch error:', error.message); return null; }
    if (!data) return null;
    const rawClauses = (data.clauses as any[]) || [];
    // Detect and ignore legacy format
    const isLegacy = rawClauses.length > 0 && 'titleRu' in rawClauses[0];
    return {
      clauses: isLegacy ? [] : (rawClauses as FlatClauseItem[]),
      updatedAt: data.updated_at || null,
      versions: ((data.versions as any[]) || []).filter((v: any) => {
        // Filter out legacy version entries
        if (!v?.clauses || !Array.isArray(v.clauses) || v.clauses.length === 0) return false;
        return !('titleRu' in v.clauses[0]);
      }) as TemplateVersion[],
    };
  } catch (e: any) {
    console.warn('[templateApi] getMasterTemplateFull exception:', e?.message);
    return null;
  }
}

/**
 * Save master template flat clauses to Supabase (upsert).
 * Before saving, archives the current version into versions[] (max 5).
 */
export async function saveMasterTemplate(clauses: FlatClauseItem[]): Promise<void> {
  const { data: existing } = await supabase
    .from('logitrans_templates')
    .select('clauses, updated_at, versions')
    .eq('id', TEMPLATE_ID)
    .maybeSingle();

  let versions: TemplateVersion[] = ((existing?.versions as any[]) || []).filter((v: any) => {
    if (!v?.clauses || !Array.isArray(v.clauses) || v.clauses.length === 0) return false;
    return !('titleRu' in v.clauses[0]);
  }) as TemplateVersion[];

  const existingClauses = (existing?.clauses as any[]) || [];
  const isLegacy = existingClauses.length > 0 && 'titleRu' in existingClauses[0];

  if (!isLegacy && existingClauses.length > 0) {
    const newVersion: TemplateVersion = {
      clauses: existingClauses as FlatClauseItem[],
      savedAt: existing?.updated_at || new Date().toISOString(),
    };
    versions = [newVersion, ...versions].slice(0, MAX_VERSIONS);
  }

  const { error } = await supabase
    .from('logitrans_templates')
    .upsert({
      id: TEMPLATE_ID,
      clauses,
      updated_at: new Date().toISOString(),
      versions,
    }, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

/**
 * Restore a specific version by index.
 */
export async function restoreTemplateVersion(versionIndex: number): Promise<FlatClauseItem[]> {
  const full = await getMasterTemplateFull();
  if (!full) throw new Error('Şablon bulunamadı');

  const target = full.versions[versionIndex];
  if (!target) throw new Error('Geçersiz versiyon');

  await saveMasterTemplate(target.clauses);
  return target.clauses;
}
