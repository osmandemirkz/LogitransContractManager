import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export interface Forwarder {
  id: string;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;

  companyNameRu: string;
  companyNameEn: string;
  companyNameTr: string;

  shortNameRu: string;
  shortNameEn: string;
  shortNameTr: string;

  directorNameRu: string;
  directorNameEn: string;
  directorNameTr: string;

  details11_1Ru: string;
  details11_1En: string;
  details11_1Tr: string;

  /** City name for contract header (EN / TR) */
  city: string;
  /** City name for contract header (RU) */
  cityRu: string;

  /** Supabase Storage public URL for stamp image */
  stampUrl?: string;
  /** Supabase Storage public URL for signature image */
  signatureUrl?: string;
  /** Stamp display scale (0.5 – 3.0, default 1.0) */
  stampScale: number;
  /** Signature display scale (0.5 – 3.0, default 1.0) */
  signatureScale: number;

  createdAt?: string;
  updatedAt?: string;
}

function fromRow(row: any): Forwarder {
  return {
    id: row.id,
    isActive: row.is_active,
    isDefault: row.is_default,
    sortOrder: row.sort_order,
    companyNameRu: row.company_name_ru,
    companyNameEn: row.company_name_en,
    companyNameTr: row.company_name_tr,
    shortNameRu: row.short_name_ru,
    shortNameEn: row.short_name_en,
    shortNameTr: row.short_name_tr,
    directorNameRu: row.director_name_ru,
    directorNameEn: row.director_name_en,
    directorNameTr: row.director_name_tr,
    details11_1Ru: row.details_11_1_ru,
    details11_1En: row.details_11_1_en,
    details11_1Tr: row.details_11_1_tr,
    city: row.city || '',
    cityRu: row.city_ru || '',
    stampUrl: row.stamp_url || undefined,
    signatureUrl: row.signature_url || undefined,
    stampScale: typeof row.stamp_scale === 'number' ? row.stamp_scale : 1.0,
    signatureScale: typeof row.signature_scale === 'number' ? row.signature_scale : 1.0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(f: Partial<Forwarder>): Record<string, any> {
  const row: Record<string, any> = {};
  if (f.id !== undefined) row.id = f.id;
  if (f.isActive !== undefined) row.is_active = f.isActive;
  if (f.isDefault !== undefined) row.is_default = f.isDefault;
  if (f.sortOrder !== undefined) row.sort_order = f.sortOrder;
  if (f.companyNameRu !== undefined) row.company_name_ru = f.companyNameRu;
  if (f.companyNameEn !== undefined) row.company_name_en = f.companyNameEn;
  if (f.companyNameTr !== undefined) row.company_name_tr = f.companyNameTr;
  if (f.shortNameRu !== undefined) row.short_name_ru = f.shortNameRu;
  if (f.shortNameEn !== undefined) row.short_name_en = f.shortNameEn;
  if (f.shortNameTr !== undefined) row.short_name_tr = f.shortNameTr;
  if (f.directorNameRu !== undefined) row.director_name_ru = f.directorNameRu;
  if (f.directorNameEn !== undefined) row.director_name_en = f.directorNameEn;
  if (f.directorNameTr !== undefined) row.director_name_tr = f.directorNameTr;
  if (f.details11_1Ru !== undefined) row.details_11_1_ru = f.details11_1Ru;
  if (f.details11_1En !== undefined) row.details_11_1_en = f.details11_1En;
  if (f.details11_1Tr !== undefined) row.details_11_1_tr = f.details11_1Tr;
  if (f.city !== undefined) row.city = f.city;
  if (f.cityRu !== undefined) row.city_ru = f.cityRu;
  if (f.stampUrl !== undefined) row.stamp_url = f.stampUrl;
  if (f.signatureUrl !== undefined) row.signature_url = f.signatureUrl;
  if (f.stampScale !== undefined) row.stamp_scale = f.stampScale;
  if (f.signatureScale !== undefined) row.signature_scale = f.signatureScale;
  row.updated_at = new Date().toISOString();
  return row;
}

/** Upload stamp or signature image to Supabase Storage and save URL to forwarder record */
export async function uploadForwarderAsset(
  forwarderId: string,
  type: 'stamp' | 'signature',
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const path = `${forwarderId}/${type}_${Date.now()}.${ext}`;

  // Fetch file as blob for better reliability
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: file.type });

  const { error: uploadError } = await supabase.storage
    .from('company-assets')
    .upload(path, blob, { contentType: file.type, upsert: true });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('company-assets')
    .getPublicUrl(path);

  const publicUrl = urlData.publicUrl;

  // Save URL to forwarder record
  const field = type === 'stamp' ? { stampUrl: publicUrl } : { signatureUrl: publicUrl };
  await updateForwarder(forwarderId, field);

  return publicUrl;
}

/** Remove stamp or signature from Storage and clear URL in forwarder record */
export async function removeForwarderAsset(
  forwarderId: string,
  type: 'stamp' | 'signature'
): Promise<void> {
  const field = type === 'stamp' ? { stampUrl: '' } : { signatureUrl: '' };
  await updateForwarder(forwarderId, field);
}

/** Fetch all forwarders ordered by sort_order */
export async function getForwarders(): Promise<Forwarder[]> {
  const { data, error } = await supabase
    .from('logitrans_forwarders')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map(fromRow);
}

/** Fetch only active forwarders (for contract form) */
export async function getActiveForwarders(): Promise<Forwarder[]> {
  const { data, error } = await supabase
    .from('logitrans_forwarders')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map(fromRow);
}

/** Fetch single forwarder by id */
export async function getForwarder(id: string): Promise<Forwarder | null> {
  const { data, error } = await supabase
    .from('logitrans_forwarders')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data) : null;
}

/** Create new forwarder */
export async function createForwarder(f: Omit<Forwarder, 'createdAt' | 'updatedAt'>): Promise<Forwarder> {
  const row = toRow(f);
  row.created_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('logitrans_forwarders')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

/** Update forwarder fields */
export async function updateForwarder(id: string, updates: Partial<Forwarder>): Promise<Forwarder> {
  const { data, error } = await supabase
    .from('logitrans_forwarders')
    .update(toRow(updates))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

/** Delete forwarder */
export async function deleteForwarder(id: string): Promise<void> {
  const { error } = await supabase
    .from('logitrans_forwarders')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/** Set one forwarder as default, clear others */
export async function setDefaultForwarder(id: string): Promise<void> {
  // Clear all defaults
  await supabase
    .from('logitrans_forwarders')
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .neq('id', '__none__');
  // Set new default
  await supabase
    .from('logitrans_forwarders')
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq('id', id);
}
