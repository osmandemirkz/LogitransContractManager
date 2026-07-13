
import { ContractFormData, ContractLanguage } from '@/types/contract';
import { COMPANIES } from '@/constants/companies';
import { getForwarder, DEFAULT_POSITION_CONFIG, PositionConfig } from '@/lib/forwardersApi';

/** Required client info fields for export validation (office phone excluded) */
export const REQUIRED_CLIENT_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'companyName', label: 'Müşteri Firma Adı' },
  { key: 'country', label: 'Ülke / Страна' },
  { key: 'city', label: 'Şehir / Город' },
  { key: 'address', label: 'Adres / Адрес' },
  { key: 'email', label: 'Email' },
  { key: 'mobilePhone', label: 'Mobil Telefon' },
  { key: 'currency', label: 'Para Birimi / Валюта' },
  { key: 'contractAmount', label: 'Sözleşme Tutarı / Сумма' },
  { key: 'account', label: 'Hesap No / ИИК' },
  { key: 'bin', label: 'Vergi No / БИН' },
  { key: 'director', label: 'Müdür / Директор' },
  { key: 'bankName', label: 'Banka Adı / Банк' },
  { key: 'swift', label: 'SWIFT' },
  { key: 'contractDate', label: 'Sözleşme Tarihi / Дата' },
  { key: 'contractNumber', label: 'Sözleşme Numarası / Номер' },
];

/** Returns list of missing required field labels */
export function getMissingRequiredFields(data: ContractFormData): string[] {
  const missing: string[] = [];
  for (const field of REQUIRED_CLIENT_FIELDS) {
    const val = (data.clientInfo as any)[field.key];
    if (!val || String(val).trim() === '') {
      missing.push(field.label);
    }
  }
  return missing;
}

async function buildForwarderData(data: ContractFormData) {
  const company = COMPANIES.find(c => c.id === data.expeditorId) || COMPANIES[0];
  let fwd = null;
  try { fwd = await getForwarder(data.expeditorId); } catch {}

  return {
    company,
    nameRu: fwd?.companyNameRu || company.nameRu,
    nameEn: fwd?.companyNameEn || company.nameEn,
    nameTr: fwd?.companyNameTr || company.nameEn,
    directorRu: fwd?.directorNameRu || company.director,
    directorEn: fwd?.directorNameEn || company.signatory || company.director,
    directorTr: fwd?.directorNameTr || company.signatory || company.director,
    details11Ru: fwd?.details11_1Ru || null,
    details11En: fwd?.details11_1En || null,
    details11Tr: fwd?.details11_1Tr || null,
    cityRu: fwd?.cityRu || company.cityRu,
    cityEn: fwd?.city || company.city,
    cityTr: fwd?.city || company.city,
    stampUrl: fwd?.stampUrl || '',
    signatureUrl: fwd?.signatureUrl || '',
    positionConfig: fwd?.positionConfig || DEFAULT_POSITION_CONFIG,
  }; // Added missing closing brace here
}

function buildClientCell(client: any, lang: ContractLanguage): string {
  const labelTitle = lang === 'ru' ? '11.2. КЛИЕНТ' : lang === 'en' ? '11.2. THE CLIENT' : '11.2. MÜŞTERİ';
  const labelAddr = lang === 'ru' ? 'Адрес' : lang === 'en' ? 'Address' : 'Adres';
  const labelBin = lang === 'ru' ? 'БИН(ИНН)' : lang === 'en' ? 'TIN' : 'Vergi No';
  const labelBank = lang === 'ru' ? 'Банк' : lang === 'en' ? 'Bank' : 'Banka';
  const labelAcc = lang === 'ru' ? 'ИИК(Счета)' : lang === 'en' ? 'Account' : 'Hesap';
  const labelTel = lang === 'ru' ? 'Тел' : 'Tel';
  const labelEmail = lang === 'ru' || lang === 'tr' ? (lang === 'tr' ? 'E-posta' : 'e-mail') : 'E-mail';
  const labelDir = lang === 'ru' ? 'Директор' : lang === 'en' ? 'Director' : 'Yönetici';

  const addr = [client.address, client.city, client.country].filter(Boolean).join(', ');
  return `<td style="border:1px solid #999;padding:8px;vertical-align:top;font-size:8pt;">
    <strong>${labelTitle}</strong><br/>
    ${client.companyName ? `<strong>«${client.companyName}»</strong><br/>` : ''}
    ${addr ? `${labelAddr}: ${addr}<br/>` : ''}
    ${client.bin ? `${labelBin}: ${client.bin}<br/>` : ''}
    ${client.bankName ? `${labelBank}: ${client.bankName}<br/>` : ''}
    ${client.account ? `${labelAcc}: ${client.account}<br/>` : ''}
    ${client.swift ? `SWIFT: ${client.swift}<br/>` : ''}
    ${client.mobilePhone ? `${labelTel}: ${client.mobilePhone}<br/>` : ''}
    ${client.email ? `${labelEmail}: ${client.email}<br/>` : ''}
    <div style="margin-top:14px;">${labelDir} ________________________ ${client.director || ''}</div>
  </td>`;
}

function buildExpeditorCell(
  lang: ContractLanguage,
  fwd: Awaited<ReturnType<typeof buildForwarderData>>,
  company: any,
  includeStamp: boolean,
  includeSignature: boolean,
  stampScale: number,
  signatureScale: number,
  langCount: number,
): string {
  const labelTitle = lang === 'ru' ? '11.1. ЭКСПЕДИТОР' : lang === 'en' ? '11.1. THE FORWARDER' : '11.1. NAKLİYECİ';
  const labelDir = lang === 'ru' ? 'Директор' : lang === 'en' ? 'Director' : 'Yönetici';
  const dirName = lang === 'ru' ? fwd.directorRu : lang === 'en' ? fwd.directorEn : fwd.directorTr;
  const details = lang === 'ru' ? fwd.details11Ru : lang === 'en' ? fwd.details11En : fwd.details11Tr;
  const stmpH = Math.round(80 * stampScale);
  const stmpW = Math.round(80 * stampScale);
  const sigH = Math.round(40 * signatureScale);

  // Position offsets from config
  const pc: PositionConfig = fwd.positionConfig || DEFAULT_POSITION_CONFIG;
  const lk = String(Math.min(langCount, 3)) as '1' | '2' | '3';
  const stampPos = pc.stamp?.[lk] || { x: 0, y: 0 };
  const sigPos = pc.sig?.[lk] || { x: 0, y: 0 };

  let detailsHtml = '';
  if (details) {
    detailsHtml = `<div style="white-space:pre-wrap;line-height:1.55;">${details}</div>`;
  } else {
    const companyName = lang === 'ru' ? company.nameRu : company.nameEn;
    const address = lang === 'ru' ? `${company.addressRu}` : `${company.address}`;
    const bankLabel = lang === 'ru' ? 'Банк' : 'Bank';
    detailsHtml = `<strong>${companyName}</strong><br/>${address}<br/>${bankLabel}: ${lang === 'ru' ? company.bankRu : company.bank}<br/>SWIFT: ${company.swift}`;
  }

  const stampHtml = includeStamp && fwd.stampUrl
    ? `<img src="${fwd.stampUrl}" style="position:absolute;top:${-stmpH/2 + stampPos.y}px;left:${stampPos.x}px;height:${stmpH}px;width:${stmpW}px;object-fit:contain;opacity:0.85;z-index:10;" />`
    : includeStamp
    ? `<div style="position:absolute;top:${-stmpH/2 + stampPos.y}px;left:${stampPos.x}px;display:inline-flex;align-items:center;justify-content:center;border:3px solid #1a3a6b;border-radius:50%;width:${stmpW}px;height:${stmpH}px;text-align:center;font-size:6pt;font-weight:bold;color:#1a3a6b;padding:8px;box-sizing:border-box;z-index:10;">LOGITRANS<br/>SEAL<br/>М.П.</div>`
    : '';

  const sigHtml = includeSignature && fwd.signatureUrl
    ? `<img src="${fwd.signatureUrl}" style="position:absolute;top:${-10 + sigPos.y}px;left:${60 + sigPos.x}px;height:${sigH}px;width:auto;object-fit:contain;z-index:10;" />`
    : includeSignature
    ? `<span style="font-family:cursive;font-size:11pt;color:#1a3a6b;position:absolute;top:${-10 + sigPos.y}px;left:${60 + sigPos.x}px;">${dirName}</span>`
    : '';

  const sigBlock = `<div style="margin-top:16px;position:relative;min-height:${stmpH + 20}px;">
    <div>${labelDir} ______________________ ${dirName}</div>
    ${sigHtml}
    ${stampHtml}
  </div>`;

  return `<td style="border:1px solid #999;padding:8px;vertical-align:top;font-size:8pt;">
    <strong>${labelTitle}</strong><br/>${detailsHtml}${sigBlock}
  </td>`;
}

export async function generateContractHTML(data: ContractFormData): Promise<string> {
  const client = data.clientInfo;
  const langs: ContractLanguage[] = data.languages?.length ? data.languages : ['ru', 'en'];
  const showRu = langs.includes('ru');
  const showEn = langs.includes('en');
  const showTr = langs.includes('tr');
  const colCount = langs.length;
  const colW = `${Math.round(100 / colCount)}%`;

  const fwd = await buildForwarderData(data);
  const company = fwd.company;
  const stampScale = data.stampScale ?? 1.0;
  const signatureScale = data.signatureScale ?? 1.0;

  const contractDate = client.contractDate
    ? new Date(client.contractDate + 'T00:00:00').toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '__.__.____';
  const contractDateEn = client.contractDate
    ? new Date(client.contractDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '__.__.____';
  const contractDateTr = client.contractDate
    ? new Date(client.contractDate + 'T00:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '__.__.____';

  // Title row
  const titleRow = `<tr>
    ${showRu ? `<td style="border:1px solid #999;padding:8px;text-align:center;background:#f8f8f8;width:${colW};">
      <div style="font-weight:bold;font-size:10pt;text-decoration:underline;">ДОГОВОР № ${client.contractNumber || '___'}</div>
      <div style="font-size:8pt;">на транспортно-экспедиционное обслуживание</div>
      <div style="margin-top:6px;font-size:8.5pt;font-weight:bold;">${fwd.cityRu} ${contractDate} г.</div>
    </td>` : ''}
    ${showEn ? `<td style="border:1px solid #999;padding:8px;text-align:center;background:#f8f8f8;width:${colW};">
      <div style="font-weight:bold;font-size:10pt;">Forwarding Service Agreement No ${client.contractNumber || '___'}</div>
      <div style="font-size:8pt;">AGREEMENT</div>
      <div style="margin-top:6px;font-size:8.5pt;font-weight:bold;">${fwd.cityEn} ${contractDateEn}</div>
    </td>` : ''}
    ${showTr ? `<td style="border:1px solid #999;padding:8px;text-align:center;background:#f8f8f8;width:${colW};">
      <div style="font-weight:bold;font-size:10pt;text-decoration:underline;">SÖZLEŞME № ${client.contractNumber || '___'}</div>
      <div style="font-size:8pt;">Taşıma ve Nakliye Hizmetleri Sözleşmesi</div>
      <div style="margin-top:6px;font-size:8.5pt;font-weight:bold;">${fwd.cityTr} ${contractDateTr}</div>
    </td>` : ''}
  </tr>`;

  // Parties row
  const clientName = client.companyName || '___';
  const clientDirector = client.director || '___';
  const partiesRow = `<tr>
    ${showRu ? `<td style="border:1px solid #999;padding:8px;vertical-align:top;font-size:8pt;">
      <span style="text-decoration:underline;">${fwd.nameRu}</span>, именуемое далее «Экспедитор», в лице Директора <span style="text-decoration:underline;">${fwd.directorRu}</span>, действующего на основании Устава, с одной стороны, и <span style="text-decoration:underline;">${clientName}</span>, именуемое далее «Клиент», в лице <span style="text-decoration:underline;">${clientDirector}</span>, действующего на основании Устава, с другой стороны, вместе именуемые Стороны, заключили настоящий договор о нижеследующем:
    </td>` : ''}
    ${showEn ? `<td style="border:1px solid #999;padding:8px;vertical-align:top;font-size:8pt;">
      ${fwd.nameEn}, hereinafter referred to as the "Forwarder," represented by Director <span style="text-decoration:underline;">${fwd.directorEn}</span>, acting on the basis of the Articles of Association, on the one part, and <span style="text-decoration:underline;">${clientName}</span>, hereinafter referred to as the "Client," represented by <span style="text-decoration:underline;">${clientDirector}</span>, acting on the basis of the Articles of Association, on the other part, hereinafter collectively referred to as the "Parties," have hereby agreed as follows:
    </td>` : ''}
    ${showTr ? `<td style="border:1px solid #999;padding:8px;vertical-align:top;font-size:8pt;">
      Bir tarafta Tüzük uyarınca hareket eden Müdür <span style="text-decoration:underline;">${fwd.directorTr}</span> temsilindeki bundan böyle "Nakliyeci" olarak anılacak olan <span style="text-decoration:underline;">${fwd.nameTr}</span> Şirketi, diğer tarafta ise Tüzük uyarınca hareket eden <span style="text-decoration:underline;">${clientDirector}</span> temsilindeki bundan böyle "Müşteri" olarak anılacak olan <span style="text-decoration:underline;">${clientName}</span> Şirketi, birlikte "Taraflar" olarak anılmak üzere, işbu sözleşmeyi aşağıdaki hususlarda akdetmişlerdir.
    </td>` : ''}
  </tr>`;

  // Clause rows
  const activeClauses = (data.clauses || [])
    .filter(c => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const clauseRows = activeClauses.map(clause => {
    const cellStyle = clause.isHeader
      ? 'border:1px solid #999;padding:6px 8px;vertical-align:top;font-size:8.5pt;font-weight:bold;background:#f4f4f4;letter-spacing:0.02em;'
      : 'border:1px solid #999;padding:6px 8px;vertical-align:top;font-size:8pt;';

    const renderCell = (content: string) =>
      clause.isHeader
        ? `<td style="${cellStyle}">${clause.itemNumber} ${content}</td>`
        : `<td style="${cellStyle}"><strong>${clause.itemNumber}</strong> <span style="white-space:pre-wrap;line-height:1.5;">${content}</span></td>`;

    const ruContent = clause.contentRu || '';
    const enContent = clause.contentEn || clause.contentRu || '';
    const trContent = clause.contentTr || clause.contentEn || clause.contentRu || '';

    return `<tr>
      ${showRu ? renderCell(ruContent) : ''}
      ${showEn ? renderCell(enContent) : ''}
      ${showTr ? renderCell(trContent) : ''}
    </tr>`;
  }).join('\n');

  // Section 11 header
  const sec11Parts: string[] = [];
  if (showRu) sec11Parts.push('11. ЮРИДИЧЕСКИЕ АДРЕСА И БАНКОВСКИЕ РЕКВИЗИТЫ СТОРОН');
  if (showEn) sec11Parts.push('11. LEGAL ADDRESSES AND BANK DETAILS OF THE PARTIES');
  if (showTr) sec11Parts.push('11. TARAFLARIN YASAL ADRESLERİ VE BANKA BİLGİLERİ');
  const sec11Header = `<tr>
    <td colspan="${colCount}" style="border:1px solid #999;padding:8px;background:#f0f0f0;text-align:center;font-weight:bold;font-size:9pt;">
      ${sec11Parts.join(' / ')}
    </td>
  </tr>`;

  // 11.1 Expeditor row
  const exp11Row = `<tr>
    ${showRu ? buildExpeditorCell('ru', fwd, company, data.includeStamp, data.includeSignature, stampScale, signatureScale, colCount) : ''}
    ${showEn ? buildExpeditorCell('en', fwd, company, data.includeStamp, data.includeSignature, stampScale, signatureScale, colCount) : ''}
    ${showTr ? buildExpeditorCell('tr', fwd, company, data.includeStamp, data.includeSignature, stampScale, signatureScale, colCount) : ''}
  </tr>`;

  // 11.2 Client row
  const cli11Row = `<tr>
    ${showRu ? buildClientCell(client, 'ru') : ''}
    ${showEn ? buildClientCell(client, 'en') : ''}
    ${showTr ? buildClientCell(client, 'tr') : ''}
  </tr>`;

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8"/>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<!--[if gte mso 9]>
<xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml>
<![endif]-->
<style>
  body { font-family: 'Times New Roman', serif; font-size: 9pt; margin: 15mm; }
  table { width: 100%; border-collapse: collapse; }
  td { font-family: 'Times New Roman', serif; }
  @page { size: A4; margin: 10mm 8mm; }
  @page WordSection1 { size: 841.9pt 595.3pt; mso-page-orientation: landscape; }
  div.WordSection1 { page: WordSection1; }
</style>
</head>
<body>
<table>
  <tbody>
    ${titleRow}
    ${partiesRow}
    ${clauseRows}
    ${sec11Header}
    ${exp11Row}
    ${cli11Row}
  </tbody>
</table>
</body>
</html>`;
}

export async function downloadAsWord(data: ContractFormData): Promise<void> {
  const html = await generateContractHTML(data);
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `contract_${data.clientInfo.contractNumber || 'draft'}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

/** @deprecated Use downloadAsWord */
export function downloadAsHTML(data: ContractFormData): void {
  downloadAsWord(data);
}

export function printContract(): void {
  window.print();
}
