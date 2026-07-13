import React, { useEffect, useState } from 'react';
import { ContractFormData, FlatClauseItem, ContractLanguage } from '@/types/contract';
import { COMPANIES } from '@/constants/companies';
import { getForwarder, Forwarder, DEFAULT_POSITION_CONFIG, PositionConfig } from '@/lib/forwardersApi';

interface ContractPreviewProps {
  data: ContractFormData;
  previewRef?: React.RefObject<HTMLDivElement>;
}

const NEEDS_CONVERSION = ['UZS', 'KZT', 'RUB'];
const MANUAL_RATES_KEY = 'logitrans_manual_rates';

function getManualRate(currency: string): number | null {
  try {
    const raw = localStorage.getItem(MANUAL_RATES_KEY);
    if (!raw) return null;
    const rates = JSON.parse(raw) as Record<string, string>;
    const v = rates[currency];
    if (!v || !v.trim()) return null;
    const n = parseFloat(v);
    return isNaN(n) || n <= 0 ? null : n;
  } catch { return null; }
}

async function fetchUsdRate(currency: string): Promise<number | null> {
  try {
    const resp = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!resp.ok) return null;
    const json = await resp.json();
    return json?.rates?.[currency] ?? null;
  } catch { return null; }
}

function formatConverted(amount: number, currency: string): string {
  return amount.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ' + currency;
}

function convertAmountsInText(text: string, rate: number, currency: string): string {
  if (!rate || rate <= 0) return text;
  const fmt = (n: number) => formatConverted(Math.round(n * rate), currency);
  return text
    .replace(/(\d+(?:[\s\u00a0]\d+)*)(?:\s*\([^)]+\))?\s+долларов\s+США/gi, (_, n) => fmt(parseFloat(n.replace(/[\s\u00a0]/g, ''))))
    .replace(/(\d+(?:[\s\u00a0]\d+)*)\s*У\.Е\./g, (_, n) => fmt(parseFloat(n.replace(/[\s\u00a0]/g, ''))))
    .replace(/(\d+(?:[\s\u00a0]\d+)*)\s*К\.Б\./g, (_, n) => fmt(parseFloat(n.replace(/[\s\u00a0]/g, ''))))
    .replace(/(\d+(?:[\s\u00a0]\d+)*)(?:\s*\([^)]+\))?\s+US\s+Dollars/gi, (_, n) => fmt(parseFloat(n.replace(/[\s\u00a0]/g, ''))))
    .replace(/(\d+(?:[\s\u00a0]\d+)*)\s*USD(?!\s*[)(/])/g, (_, n) => fmt(parseFloat(n.replace(/[\s\u00a0]/g, ''))))
    .replace(/(\d+(?:[\s\u00a0]\d+)*)\s+standard\s+units/gi, (_, n) => fmt(parseFloat(n.replace(/[\s\u00a0]/g, ''))))
    .replace(/(\d+(?:[\s\u00a0]\d+)*)(?:\s*\([^)]+\))?\s+ABD\s+Doları/gi, (_, n) => fmt(parseFloat(n.replace(/[\s\u00a0]/g, ''))))
    .replace(/(\d+(?:[\s\u00a0]\d+)*)\s*(?:koşullu\s+birim(?:\s*\(K\.B\.\))?|K\.B\.)/gi, (_, n) => fmt(parseFloat(n.replace(/[\s\u00a0]/g, ''))));
}

const ContractPreview: React.FC<ContractPreviewProps> = ({ data, previewRef }) => {
  const currency = data.clientInfo.currency || 'USD';
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateSource, setRateSource] = useState<'manual' | 'api' | null>(null);
  const [forwarder, setForwarder] = useState<Forwarder | null>(null);

  useEffect(() => {
    if (!data.expeditorId) return;
    getForwarder(data.expeditorId)
      .then(f => setForwarder(f))
      .catch(e => console.warn('[ContractPreview] forwarder load failed:', e?.message));
  }, [data.expeditorId]);

  useEffect(() => {
    if (!NEEDS_CONVERSION.includes(currency)) { setExchangeRate(null); setRateSource(null); return; }
    const manual = getManualRate(currency);
    if (manual) { setExchangeRate(manual); setRateSource('manual'); return; }
    setRateLoading(true);
    fetchUsdRate(currency)
      .then(rate => { setExchangeRate(rate); setRateSource(rate ? 'api' : null); })
      .finally(() => setRateLoading(false));
  }, [currency]);

  const convertText = (text: string): string => {
    if (!NEEDS_CONVERSION.includes(currency) || !exchangeRate) return text;
    return convertAmountsInText(text, exchangeRate, currency);
  };

  // Legacy fallback company (stamp/signature assets still use this)
  const company = COMPANIES.find(c => c.id === data.expeditorId) || COMPANIES[0];

  // Dynamic forwarder data (from DB)
  const fwd = forwarder;
  const fwdNameRu = fwd?.companyNameRu || company.nameRu;
  const fwdNameEn = fwd?.companyNameEn || company.nameEn;
  const fwdNameTr = fwd?.companyNameTr || company.nameEn;
  const fwdDirectorRu = fwd?.directorNameRu || company.director;
  const fwdDirectorEn = fwd?.directorNameEn || (company.signatory || company.director);
  const fwdDirectorTr = fwd?.directorNameTr || (company.signatory || company.director);
  const fwdDetails11Ru = fwd?.details11_1Ru || null;
  const fwdDetails11En = fwd?.details11_1En || null;
  const fwdDetails11Tr = fwd?.details11_1Tr || null;
  // City for contract header — prefer forwarder DB, fallback to static COMPANIES
  const fwdCity = fwd?.city || company.city;
  const fwdCityRu = fwd?.cityRu || company.cityRu;
  const client = data.clientInfo;
  const stampUrl = forwarder?.stampUrl || '';
  const signatureUrl = forwarder?.signatureUrl || '';
  const stampScale = data.stampScale ?? 1.0;
  const signatureScale = data.signatureScale ?? 1.0;
  const langs: ContractLanguage[] = data.languages?.length ? data.languages : ['ru', 'en'];
  const showRu = langs.includes('ru');
  const showEn = langs.includes('en');
  const showTr = langs.includes('tr');
  const colCount = langs.length;

  // Get active flat clauses sorted
  const activeClauses = (data.clauses || [])
    .filter(c => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const countryTr = company.country === 'Russia' ? 'Rusya'
    : company.country === 'Uzbekistan' ? 'Özbekistan'
    : company.country === 'Kazakhstan' ? 'Kazakistan'
    : 'Türkiye';

  const contractDate = client.contractDate
    ? new Date(client.contractDate + 'T00:00:00').toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '__.__.____';
  const contractDateEn = client.contractDate
    ? new Date(client.contractDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '__.__.____';
  const contractDateTr = client.contractDate
    ? new Date(client.contractDate + 'T00:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '__.__.____';

  const clientName = client.companyName || '___';
  const clientDirector = client.director || '___';
  const contractNum = client.contractNumber || '___';

  const cellStyle: React.CSSProperties = {
    border: '1px solid #888',
    padding: '6px 8px',
    verticalAlign: 'top',
    fontSize: '8pt',
    width: `${100 / colCount}%`,
  };

  const titleCellStyle: React.CSSProperties = {
    ...cellStyle,
    textAlign: 'center',
    background: '#f8f8f8',
  };

  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    fontWeight: 'bold',
    fontSize: '8.5pt',
    background: '#f4f4f4',
    letterSpacing: '0.02em',
  };

  const positionConfig: PositionConfig = forwarder?.positionConfig || DEFAULT_POSITION_CONFIG;
  const langKey = String(colCount) as '1' | '2' | '3';
  const stampPos = positionConfig.stamp?.[langKey] || { x: 0, y: 0 };
  const sigPos = positionConfig.sig?.[langKey] || { x: 0, y: 0 };

  const signatureBlock = (directorLabel: string, nameStr: string) => {
    const sigH = Math.round(40 * signatureScale);
    const stmpH = Math.round(80 * stampScale);
    const stmpW = Math.round(80 * stampScale);
    return (
      <div style={{ position: 'relative', marginTop: '16px', minHeight: `${stmpH + 20}px` }}>
        {/* Director line */}
        <div>{directorLabel} ______________________ {nameStr}</div>
        {/* Signature overlay — absolute, on top of text */}
        {data.includeSignature && signatureUrl && (
          <img src={signatureUrl} alt="signature"
            style={{
              position: 'absolute',
              top: `${-10 + sigPos.y}px`,
              left: `${60 + sigPos.x}px`,
              height: `${sigH}px`,
              width: 'auto',
              objectFit: 'contain',
              zIndex: 10,
              pointerEvents: 'none',
            }} />
        )}
        {data.includeSignature && !signatureUrl && (
          <div style={{ fontStyle: 'italic', fontFamily: 'cursive', fontSize: `${Math.round(14 * signatureScale)}pt`, color: '#1a3a6b', marginTop: '-4px' }}>{nameStr}</div>
        )}
        {/* Stamp overlay — absolute, on top of text */}
        {data.includeStamp && (
          stampUrl
            ? <img src={stampUrl} alt="stamp"
                style={{
                  position: 'absolute',
                  top: `${-stmpH / 2 + stampPos.y}px`,
                  left: `${stampPos.x}px`,
                  height: `${stmpH}px`,
                  width: `${stmpW}px`,
                  objectFit: 'contain',
                  opacity: 0.85,
                  zIndex: 10,
                  pointerEvents: 'none',
                }} />
            : (
                <div style={{ position: 'absolute', top: `${-stmpH / 2 + stampPos.y}px`, left: `${stampPos.x}px`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #1a3a6b', borderRadius: '50%', width: `${stmpW}px`, height: `${stmpH}px`, fontSize: '6pt', fontWeight: 'bold', color: '#1a3a6b', textAlign: 'center', lineHeight: '1.3', padding: '8px', zIndex: 10 }}>
                    <div>LOGITRANS<br />OFFICIAL<br />SEAL<br />М.П.</div>
                  </div>
              )
        )}
      </div>
    );
  };

  return (
    <>
      {/* Print styles injected via style tag */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .contract-preview-container { box-shadow: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page {
            size: A4;
            margin: 10mm 8mm 10mm 8mm;
          }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          td { page-break-inside: avoid; }
        }
      `}</style>

      <div className="contract-preview-container bg-white" style={{ fontFamily: "'Times New Roman', Georgia, serif", fontSize: '8pt', lineHeight: '1.5', color: '#111' }}>
        {NEEDS_CONVERSION.includes(currency) && (
          <div className="no-print" style={{ padding: '6px 12px', background: rateLoading ? '#fff8e1' : exchangeRate ? '#e8f5e9' : '#fce4ec', borderBottom: '1px solid #ddd', fontSize: '7.5pt', color: rateLoading ? '#795548' : exchangeRate ? '#2e7d32' : '#c62828', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {rateLoading && <span>Doviz kuru aliniyor...</span>}
            {!rateLoading && exchangeRate && (
              <span>1 USD = {exchangeRate.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} {currency}{rateSource === 'manual' ? ' (sabit kur — admin)' : ' (güncel kur — internet)'} — Ceza tutarları {currency} olarak dönüştürüldü</span>
            )}
            {!rateLoading && !exchangeRate && <span>Doviz kuru alinamadi, tutarlar USD olarak gosterilmektedir</span>}
          </div>
        )}

        <div ref={previewRef} style={{ padding: '12px 10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {/* Title */}
              <tr>
                {showRu && (
                  <td style={titleCellStyle}>
                    <div style={{ fontWeight: 'bold', fontSize: '10pt', textDecoration: 'underline' }}>ДОГОВОР № {contractNum}</div>
                    <div style={{ fontSize: '8pt', marginTop: '2px' }}>на транспортно-экспедиционное обслуживание</div>
                    <div style={{ marginTop: '6px', fontSize: '8.5pt', fontWeight: 'bold' }}>{fwdCityRu} {contractDate} г.</div>
                  </td>
                )}
                {showEn && (
                  <td style={titleCellStyle}>
                    <div style={{ fontWeight: 'bold', fontSize: '10pt' }}>Forwarding Service Agreement No {contractNum}</div>
                    <div style={{ fontSize: '8pt', marginTop: '2px' }}>AGREEMENT</div>
                    <div style={{ marginTop: '6px', fontSize: '8.5pt', fontWeight: 'bold' }}>{fwdCity} {contractDateEn}</div>
                  </td>
                )}
                {showTr && (
                  <td style={titleCellStyle}>
                    <div style={{ fontWeight: 'bold', fontSize: '10pt', textDecoration: 'underline' }}>SÖZLEŞME № {contractNum}</div>
                    <div style={{ fontSize: '8pt', marginTop: '2px' }}>Taşıma ve Nakliye Hizmetleri Sözleşmesi</div>
                    <div style={{ marginTop: '6px', fontSize: '8.5pt', fontWeight: 'bold' }}>{fwdCity} {contractDateTr}</div>
                  </td>
                )}
              </tr>

              {/* Parties */}
              <tr>
                {showRu && (
                  <td style={cellStyle}>
                    <span style={{ textDecoration: 'underline' }}>{fwdNameRu}</span>, именуемое далее «Экспедитор», в лице Директора <span style={{ textDecoration: 'underline' }}>{fwdDirectorRu}</span>, действующего на основании Устава, с одной стороны, и <span style={{ textDecoration: 'underline' }}>{clientName}</span>, именуемое далее «Клиент», в лице <span style={{ textDecoration: 'underline' }}>{clientDirector}</span>, действующего на основании Устава, с другой стороны, вместе именуемые Стороны, заключили настоящий договор о нижеследующем:
                  </td>
                )}
                {showEn && (
                  <td style={cellStyle}>
                    {fwdNameEn}, hereinafter referred to as the "Forwarder," represented by Director <span style={{ textDecoration: 'underline' }}>{fwdDirectorEn}</span>, acting on the basis of the Articles of Association, on the one part, and <span style={{ textDecoration: 'underline' }}>{clientName}</span>, hereinafter referred to as the "Client," represented by <span style={{ textDecoration: 'underline' }}>{clientDirector}</span>, acting on the basis of the Articles of Association, on the other part, hereinafter collectively referred to as the "Parties," have hereby agreed as follows:
                  </td>
                )}
                {showTr && (
                  <td style={cellStyle}>
                    Bir tarafta Tüzük uyarınca hareket eden Müdür <span style={{ textDecoration: 'underline' }}>{fwdDirectorTr}</span> temsilindeki bundan böyle "Nakliyeci" olarak anılacak olan <span style={{ textDecoration: 'underline' }}>{fwdNameTr}</span> Şirketi, diğer tarafta ise Tüzük uyarınca hareket eden <span style={{ textDecoration: 'underline' }}>{clientDirector}</span> temsilindeki bundan böyle "Müşteri" olarak anılacak olan <span style={{ textDecoration: 'underline' }}>{clientName}</span> Şirketi, birlikte "Taraflar" olarak anılmak üzere, işbu sözleşmeyi aşağıdaki hususlarda akdetmişlerdir.
                  </td>
                )}
              </tr>

              {/* Flat clause items */}
              {activeClauses.map(clause => {
                if (clause.isHeader) {
                  // Section header row — bold, light background
                  return (
                    <tr key={clause.id}>
                      {showRu && (
                        <td style={headerCellStyle}>
                          {clause.itemNumber} {convertText(clause.contentRu)}
                        </td>
                      )}
                      {showEn && (
                        <td style={headerCellStyle}>
                          {clause.itemNumber} {convertText(clause.contentEn || clause.contentRu)}
                        </td>
                      )}
                      {showTr && (
                        <td style={headerCellStyle}>
                          {clause.itemNumber} {convertText(clause.contentTr || clause.contentEn || clause.contentRu)}
                        </td>
                      )}
                    </tr>
                  );
                }
                // Content row
                return (
                  <tr key={clause.id}>
                    {showRu && (
                      <td style={cellStyle}>
                        <span style={{ fontWeight: 600, marginRight: '4px' }}>{clause.itemNumber}</span>
                        <span style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{convertText(clause.contentRu)}</span>
                      </td>
                    )}
                    {showEn && (
                      <td style={cellStyle}>
                        <span style={{ fontWeight: 600, marginRight: '4px' }}>{clause.itemNumber}</span>
                        <span style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{convertText(clause.contentEn || clause.contentRu)}</span>
                      </td>
                    )}
                    {showTr && (
                      <td style={cellStyle}>
                        <span style={{ fontWeight: 600, marginRight: '4px' }}>{clause.itemNumber}</span>
                        <span style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{convertText(clause.contentTr || clause.contentEn || clause.contentRu)}</span>
                      </td>
                    )}
                  </tr>
                );
              })}

              {/* Section 11 header */}
              <tr>
                <td colSpan={colCount} style={{ border: '1px solid #888', padding: '8px', background: '#f0f0f0', textAlign: 'center', fontWeight: 'bold', fontSize: '9pt' }}>
                  {showRu && '11. ЮРИДИЧЕСКИЕ АДРЕСА И БАНКОВСКИЕ РЕКВИЗИТЫ СТОРОН'}
                  {showRu && (showEn || showTr) && ' / '}
                  {showEn && '11. LEGAL ADDRESSES AND BANK DETAILS OF THE PARTIES'}
                  {showTr && (showRu || showEn) && ' / '}
                  {showTr && '11. TARAFLARIN YASAL ADRESLERİ VE BANKA BİLGİLERİ'}
                </td>
              </tr>

              {/* Expeditor details */}
              <tr>
                {showRu && (
                  <td style={cellStyle}>
                    <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>11.1. ЭКСПЕДИТОР</div>
                    {fwdDetails11Ru ? (
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.55' }}>{fwdDetails11Ru}</div>
                    ) : (
                      <>
                        <div style={{ fontWeight: 'bold' }}>{company.nameRu}</div>
                        <div>Адрес: {company.addressRu}</div>
                        {company.phone && <div>Тел: {company.phone}</div>}
                        {company.email && <div>e-mail: {company.email}</div>}
                        <div>{company.legalCode}</div>
                        <div>Банк: {company.bankRu}</div>
                        {company.accountLocal && <div>Р/с: {company.accountLocal}</div>}
                        {company.accountUSD && <div>в/с: {company.accountUSD}</div>}
                        {company.accountEUR && <div>в/с: {company.accountEUR}</div>}
                        <div>SWIFT: {company.swift}</div>
                        {company.extraBankInfo && <div style={{ fontSize: '7pt', color: '#555' }}>{company.extraBankInfo}</div>}
                        {company.kbe && <div>{company.kbe}</div>}
                      </>
                    )}
                    {signatureBlock('Директор', fwdDirectorRu)}
                  </td>
                )}
                {showEn && (
                  <td style={cellStyle}>
                    <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>11.1. THE FORWARDER</div>
                    {fwdDetails11En ? (
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.55' }}>{fwdDetails11En}</div>
                    ) : (
                      <>
                        <div style={{ fontWeight: 'bold' }}>{company.nameEn}</div>
                        <div>Address: {company.address}</div>
                        {company.phone && <div>Tel: {company.phone}</div>}
                        {company.email && <div>E-mail: {company.email}</div>}
                        <div>{company.legalCode}</div>
                        <div>Bank: {company.bank}</div>
                        {company.accountLocal && <div>{company.accountLocal}</div>}
                        {company.accountUSD && <div>{company.accountUSD}</div>}
                        {company.accountEUR && <div>{company.accountEUR}</div>}
                        <div>SWIFT: {company.swift}</div>
                        {company.kbe && <div>{company.kbe}</div>}
                      </>
                    )}
                    {signatureBlock('Director', fwdDirectorEn)}
                  </td>
                )}
                {showTr && (
                  <td style={cellStyle}>
                    <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>11.1. NAKLİYECİ</div>
                    {fwdDetails11Tr ? (
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.55' }}>{fwdDetails11Tr}</div>
                    ) : (
                      <>
                        <div style={{ fontWeight: 'bold' }}>{company.nameEn}</div>
                        <div>Adres: {company.address}</div>
                        {company.phone && <div>Tel: {company.phone}</div>}
                        {company.email && <div>E-posta: {company.email}</div>}
                        <div>{company.legalCode}</div>
                        <div>Banka: {company.bank}</div>
                        {company.accountLocal && <div>{company.accountLocal}</div>}
                        {company.accountUSD && <div>{company.accountUSD}</div>}
                        {company.accountEUR && <div>{company.accountEUR}</div>}
                        <div>SWIFT: {company.swift}</div>
                      </>
                    )}
                    {signatureBlock('Yönetici', fwdDirectorTr)}
                  </td>
                )}
              </tr>

              {/* Client details */}
              <tr>
                {showRu && (
                  <td style={cellStyle}>
                    <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>11.2. КЛИЕНТ</div>
                    {client.companyName && <div style={{ fontWeight: 'bold' }}>«{client.companyName}»</div>}
                    {(client.address || client.city || client.country) && <div>Адрес: {[client.address, client.city, client.country].filter(Boolean).join(', ')}</div>}
                    {client.bin && <div>БИН(ИНН): {client.bin}</div>}
                    {client.bankName && <div>Банк: {client.bankName}</div>}
                    {client.account && <div>ИИК(Счета): {client.account}</div>}
                    {client.swift && <div>SWIFT: {client.swift}</div>}
                    {client.mobilePhone && <div>Тел: {client.mobilePhone}</div>}
                    {client.email && <div>e-mail: {client.email}</div>}
                    <div style={{ marginTop: '16px' }}>Директор ________________________ {client.director}</div>
                  </td>
                )}
                {showEn && (
                  <td style={cellStyle}>
                    <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>11.2. THE CLIENT</div>
                    {client.companyName && <div style={{ fontWeight: 'bold' }}>«{client.companyName}»</div>}
                    {(client.address || client.city || client.country) && <div>Address: {[client.address, client.city, client.country].filter(Boolean).join(', ')}</div>}
                    {client.bin && <div>TIN: {client.bin}</div>}
                    {client.bankName && <div>Bank: {client.bankName}</div>}
                    {client.account && <div>Account: {client.account}</div>}
                    {client.swift && <div>SWIFT: {client.swift}</div>}
                    {client.mobilePhone && <div>Tel: {client.mobilePhone}</div>}
                    {client.email && <div>E-mail: {client.email}</div>}
                    <div style={{ marginTop: '16px' }}>Director ________________________ {client.director}</div>
                  </td>
                )}
                {showTr && (
                  <td style={cellStyle}>
                    <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>11.2. MÜŞTERİ</div>
                    {client.companyName && <div style={{ fontWeight: 'bold' }}>«{client.companyName}»</div>}
                    {(client.address || client.city || client.country) && <div>Adres: {[client.address, client.city, client.country].filter(Boolean).join(', ')}</div>}
                    {client.bin && <div>Vergi No: {client.bin}</div>}
                    {client.bankName && <div>Banka: {client.bankName}</div>}
                    {client.account && <div>Hesap: {client.account}</div>}
                    {client.swift && <div>SWIFT: {client.swift}</div>}
                    {client.mobilePhone && <div>Tel: {client.mobilePhone}</div>}
                    {client.email && <div>E-posta: {client.email}</div>}
                    <div style={{ marginTop: '16px' }}>Yönetici ________________________ {client.director}</div>
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default ContractPreview;
