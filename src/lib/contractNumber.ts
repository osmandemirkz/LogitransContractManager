import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function getCompanyPrefix(companyId: string): string {
  const map: Record<string, string> = {
    logitrans_uz: 'UZ',
    logitrans_kz: 'KZ',
    lgs_kz: 'LGS',
    lgs_ru: 'RU',
    logitrans_tr: 'TR',
  };
  return map[companyId] || 'DOC';
}

export function formatNumber(prefix: string, count: number): string {
  const year = String(new Date().getFullYear()).slice(-2);
  const num = String(count).padStart(2, '0');
  return `${prefix}${num}-${year}`;
}

/** Clear ALL localStorage counter caches for all known prefixes */
export function clearAllCounterCaches(): void {
  const prefixes = ['UZ', 'KZ', 'LGS', 'RU', 'TR', 'DOC'];
  const year = new Date().getFullYear();
  prefixes.forEach(p => {
    localStorage.removeItem(`logitrans_counter_cache_${p}_${year}`);
  });
  console.log('[contractNumber] All counter caches cleared');
}

/**
 * Generate next contract number using an atomic DB function.
 * Uses PostgreSQL `next_contract_counter(prefix, year)` RPC to prevent
 * race conditions where two concurrent calls would get the same number.
 */
export async function generateContractNumber(companyId: string): Promise<string> {
  const prefix = getCompanyPrefix(companyId);
  const year = new Date().getFullYear();

  // Atomic increment via Supabase RPC — no race conditions
  const { data, error } = await supabase.rpc('next_contract_counter', {
    p_prefix: prefix,
    p_year: year,
  });

  if (error) {
    console.error('[contractNumber] RPC error, falling back to manual increment:', error.message);
    // Fallback: manual increment (less safe but better than failing)
    return generateContractNumberFallback(companyId);
  }

  const nextCount = data as number;
  updateCounterCache(companyId, nextCount);
  console.log('[contractNumber] Generated (atomic):', formatNumber(prefix, nextCount));
  return formatNumber(prefix, nextCount);
}

/** Fallback for RPC failures — non-atomic, use only as last resort */
async function generateContractNumberFallback(companyId: string): Promise<string> {
  const prefix = getCompanyPrefix(companyId);
  const year = new Date().getFullYear();

  const { data: existing } = await supabase
    .from('logitrans_contract_counters')
    .select('counter')
    .eq('prefix', prefix)
    .eq('year', year)
    .maybeSingle();

  const nextCount = (existing?.counter ?? 0) + 1;

  if (existing) {
    await supabase
      .from('logitrans_contract_counters')
      .update({ counter: nextCount })
      .eq('prefix', prefix)
      .eq('year', year);
  } else {
    await supabase
      .from('logitrans_contract_counters')
      .insert({ prefix, year, counter: nextCount });
  }

  updateCounterCache(companyId, nextCount);
  console.log('[contractNumber] Generated (fallback):', formatNumber(prefix, nextCount));
  return formatNumber(prefix, nextCount);
}

/** Peek next number without incrementing — always reads from Supabase */
export async function peekNextContractNumber(companyId: string): Promise<string> {
  const prefix = getCompanyPrefix(companyId);
  const year = new Date().getFullYear();

  const { data } = await supabase
    .from('logitrans_contract_counters')
    .select('counter')
    .eq('prefix', prefix)
    .eq('year', year)
    .maybeSingle();

  const current = data?.counter ?? 0;
  updateCounterCache(companyId, current);
  return formatNumber(prefix, current + 1);
}

/**
 * Set counter to a specific value (used by admin panel).
 * nextNumber will be startFrom (i.e. we store startFrom - 1 so next call generates startFrom).
 */
export async function setCounterValue(
  prefix: string,
  startFrom: number
): Promise<void> {
  const year = new Date().getFullYear();
  const storeValue = startFrom - 1; // so next generate() yields startFrom

  const { data: existing } = await supabase
    .from('logitrans_contract_counters')
    .select('counter')
    .eq('prefix', prefix)
    .eq('year', year)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('logitrans_contract_counters')
      .update({ counter: storeValue })
      .eq('prefix', prefix)
      .eq('year', year);
  } else {
    await supabase
      .from('logitrans_contract_counters')
      .insert({ prefix, year, counter: storeValue });
  }

  // Clear cache so next peek reads fresh
  clearAllCounterCaches();
  console.log('[contractNumber] Counter set: prefix=%s startFrom=%d stored=%d', prefix, startFrom, storeValue);
}

/**
 * Reset ALL counters to 0 and clear cache.
 */
export async function resetAllCounters(): Promise<void> {
  const { error } = await supabase
    .from('logitrans_contract_counters')
    .delete()
    .neq('prefix', '__nonexistent__');
  if (error) throw error;
  clearAllCounterCaches();
  console.log('[contractNumber] All counters reset');
}

/**
 * Initialize counter row if it doesn't exist yet.
 */
export async function initCounterIfNeeded(companyId: string): Promise<void> {
  const prefix = getCompanyPrefix(companyId);
  const year = new Date().getFullYear();
  const { data } = await supabase
    .from('logitrans_contract_counters')
    .select('counter')
    .eq('prefix', prefix)
    .eq('year', year)
    .maybeSingle();
  if (!data) {
    await supabase
      .from('logitrans_contract_counters')
      .insert({ prefix, year, counter: 0 });
    console.log('[contractNumber] Initialized counter for', prefix, year);
  } else {
    updateCounterCache(companyId, data.counter);
  }
}

/** Synchronous fallback for display only (uses localStorage cache) */
export function peekNextContractNumberSync(companyId: string): string {
  const prefix = getCompanyPrefix(companyId);
  const year = new Date().getFullYear();
  const cacheKey = `logitrans_counter_cache_${prefix}_${year}`;
  const cached = localStorage.getItem(cacheKey);
  const current = cached ? parseInt(cached, 10) : 0;
  return formatNumber(prefix, current + 1);
}

/** Update local cache after fetching real value */
export function updateCounterCache(companyId: string, value: number): void {
  const prefix = getCompanyPrefix(companyId);
  const year = new Date().getFullYear();
  const cacheKey = `logitrans_counter_cache_${prefix}_${year}`;
  localStorage.setItem(cacheKey, String(value));
}
