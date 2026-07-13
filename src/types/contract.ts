export interface Company {
  id: string;
  nameRu: string;
  nameEn: string;
  city: string;
  cityRu: string;
  country: string;
  countryRu: string;
  address: string;
  addressRu: string;
  director: string;
  bin: string;
  bank: string;
  bankRu: string;
  accountUSD: string;
  accountEUR: string;
  accountLocal: string;
  swift: string;
  phone: string;
  email: string;
  kbe: string;
  extraBankInfo: string;
  legalCode: string;
  currency: string;
  signatory?: string;
}

export interface ClientInfo {
  companyName: string;
  country: string;
  city: string;
  address: string;
  sector: string;
  email: string;
  mobilePhone: string;
  officePhone: string;
  currency: string;
  account: string;
  bin: string;
  director: string;
  bankName: string;
  swift: string;
  contractDate: string;
  contractNumber: string;
  contractAmount?: string;
}

/** Legacy clause structure — kept for backward compatibility with saved drafts */
export interface ContractClause {
  id: string;
  numberRu: string;
  numberEn: string;
  numberTr: string;
  titleRu: string;
  titleEn: string;
  titleTr: string;
  contentRu: string;
  contentEn: string;
  contentTr: string;
  enabled: boolean;
  editable?: boolean;
}

/**
 * Flat clause item — new structure.
 * Each sub-clause (1, 1.1, 1.2, 2, 2.1 ...) is an independent record.
 * isHeader=true means this row is a section title (bold, no body text).
 */
export interface FlatClauseItem {
  id: string;
  /** e.g. "1", "1.1", "1.2", "2", "2.1" */
  itemNumber: string;
  contentRu: string;
  contentEn: string;
  contentTr: string;
  isActive: boolean;
  sortOrder: number;
  /** If true, this row is a section heading (rendered bold, no pre-wrap body) */
  isHeader?: boolean;
}

export type ContractLanguage = 'ru' | 'en' | 'tr';

export interface SavedContract {
  id: string;
  contractNumber: string;
  clientName: string;
  expeditorId: string;
  createdAt: string;
  status: 'draft' | 'sent' | 'signed';
  formData: ContractFormData;
  savedBy?: string;
  pdfLink?: string;
}

export interface ContractFormData {
  expeditorId: string;
  managerId: string;
  clientInfo: ClientInfo;
  /** Flat clause items (new structure) */
  clauses: FlatClauseItem[];
  /** Legacy ContractClause[] stored in older drafts — migrated on load */
  legacyClauses?: ContractClause[];
  stampUrl?: string;
  signatureUrl?: string;
  stampScale?: number;
  signatureScale?: number;
  includeStamp: boolean;
  includeSignature: boolean;
  languages: ContractLanguage[];
}

export interface Manager {
  id: string;
  name: string;
  companyId: string;
}
