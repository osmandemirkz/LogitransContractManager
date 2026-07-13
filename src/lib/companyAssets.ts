const ASSETS_KEY = 'logitrans_company_assets';

export interface CompanyAssets {
  companyId: string;
  stampUrl?: string;    // base64 data URL
  signatureUrl?: string; // base64 data URL
}

export function getCompanyAssets(companyId: string): CompanyAssets {
  const all = getAllAssets();
  return all.find(a => a.companyId === companyId) || { companyId };
}

export function getAllAssets(): CompanyAssets[] {
  return JSON.parse(localStorage.getItem(ASSETS_KEY) || '[]');
}

export function saveCompanyAssets(assets: CompanyAssets): void {
  const all = getAllAssets();
  const idx = all.findIndex(a => a.companyId === assets.companyId);
  if (idx >= 0) {
    all[idx] = assets;
  } else {
    all.push(assets);
  }
  localStorage.setItem(ASSETS_KEY, JSON.stringify(all));
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Pre-load the Logitrans UZ stamp — admin must upload via panel
// Default stamp paths for known companies (will be overridden by admin uploads)
export const DEFAULT_STAMP_URLS: Record<string, string> = {};
export const DEFAULT_SIGNATURE_URLS: Record<string, string> = {};
