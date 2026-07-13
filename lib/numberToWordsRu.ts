/**
 * Converts a number to Russian words for contract amounts.
 * Supports up to trillions with common currency forms.
 */

const ones = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять',
  'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать',
  'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];

const onesF = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять',
  'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать',
  'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];

const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят',
  'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];

const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот',
  'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

/** Returns the correct Russian plural form based on last 2 digits */
function pluralize(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n);
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 19) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

/** Convert 1–999 to Russian words. feminine=true for тысяча (1→одна, 2→две) */
function threeDigits(n: number, feminine = false): string {
  if (n === 0) return '';
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rem = n % 100;
  const t = Math.floor(rem / 10);
  const o = rem % 10;

  if (h > 0) parts.push(hundreds[h]);

  if (rem < 20 && rem > 0) {
    parts.push(feminine ? onesF[rem] : ones[rem]);
  } else {
    if (t > 0) parts.push(tens[t]);
    if (o > 0) parts.push(feminine ? onesF[o] : ones[o]);
  }

  return parts.filter(Boolean).join(' ');
}

/** Currency name in Russian (genitive plural/nominative based on amount) */
function currencyName(currency: string, amount: number): string {
  const map: Record<string, [string, string, string]> = {
    USD: ['доллар США', 'доллара США', 'долларов США'],
    EUR: ['евро', 'евро', 'евро'],
    RUB: ['российский рубль', 'российских рубля', 'российских рублей'],
    KZT: ['казахстанский тенге', 'казахстанских тенге', 'казахстанских тенге'],
    UZS: ['узбекский сум', 'узбекских сума', 'узбекских сумов'],
    TRY: ['турецкая лира', 'турецких лиры', 'турецких лир'],
  };
  const forms = map[currency] || [`${currency}`, `${currency}`, `${currency}`];
  return pluralize(amount, forms);
}

/**
 * Formats a number with spaces as thousands separators: 1000000 → "1 000 000"
 */
export function formatNumberRu(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Converts a number to Russian words.
 * E.g. 1000000 → "один миллион"
 */
export function numberToWordsRu(n: number): string {
  if (isNaN(n) || !isFinite(n)) return '';
  if (n === 0) return 'ноль';

  const parts: string[] = [];

  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const remainder = Math.floor(n % 1_000);

  if (billions > 0) {
    parts.push(threeDigits(billions));
    parts.push(pluralize(billions, ['миллиард', 'миллиарда', 'миллиардов']));
  }
  if (millions > 0) {
    parts.push(threeDigits(millions));
    parts.push(pluralize(millions, ['миллион', 'миллиона', 'миллионов']));
  }
  if (thousands > 0) {
    parts.push(threeDigits(thousands, true)); // feminine for тысяча
    parts.push(pluralize(thousands, ['тысяча', 'тысячи', 'тысяч']));
  }
  if (remainder > 0) {
    parts.push(threeDigits(remainder));
  }

  return parts.filter(Boolean).join(' ');
}

// ─── English number words ─────────────────────────────────────────────────

const onesEn = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const tensEn = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function threeDigitsEn(n: number): string {
  if (n === 0) return '';
  const h = Math.floor(n / 100);
  const rem = n % 100;
  const t = Math.floor(rem / 10);
  const o = rem % 10;
  const parts: string[] = [];
  if (h > 0) parts.push(onesEn[h] + ' hundred');
  if (rem < 20 && rem > 0) { parts.push(onesEn[rem]); }
  else { if (t > 0) parts.push(tensEn[t]); if (o > 0) parts.push(onesEn[o]); }
  return parts.join(' ');
}

export function numberToWordsEn(n: number): string {
  if (isNaN(n) || !isFinite(n)) return '';
  if (n === 0) return 'zero';
  const parts: string[] = [];
  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const remainder = Math.floor(n % 1_000);
  if (billions > 0) parts.push(threeDigitsEn(billions) + ' billion');
  if (millions > 0) parts.push(threeDigitsEn(millions) + ' million');
  if (thousands > 0) parts.push(threeDigitsEn(thousands) + ' thousand');
  if (remainder > 0) parts.push(threeDigitsEn(remainder));
  return parts.join(' ');
}

function currencyNameEn(currency: string): string {
  const map: Record<string, string> = {
    USD: 'US Dollars', EUR: 'Euros', RUB: 'Russian Rubles',
    KZT: 'Kazakhstani Tenge', UZS: 'Uzbekistani Sum', TRY: 'Turkish Lira',
  };
  return map[currency] || currency;
}

// ─── Turkish number words ───────────────────────────────────────────────────

const onesTr = [
  '', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz',
  'on', 'on bir', 'on iki', 'on üç', 'on dört', 'on beş',
  'on altı', 'on yedi', 'on sekiz', 'on dokuz',
];
const tensTr = ['', '', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
const hundredsTr = ['', 'yüz', 'iki yüz', 'üç yüz', 'dört yüz', 'beş yüz', 'altı yüz', 'yedi yüz', 'sekiz yüz', 'dokuz yüz'];

function threeDigitsTr(n: number): string {
  if (n === 0) return '';
  const h = Math.floor(n / 100);
  const rem = n % 100;
  const t = Math.floor(rem / 10);
  const o = rem % 10;
  const parts: string[] = [];
  if (h > 0) parts.push(h === 1 ? 'yüz' : hundredsTr[h]);
  if (rem < 20 && rem > 0) { parts.push(onesTr[rem]); }
  else { if (t > 0) parts.push(tensTr[t]); if (o > 0) parts.push(onesTr[o]); }
  return parts.join(' ');
}

export function numberToWordsTr(n: number): string {
  if (isNaN(n) || !isFinite(n)) return '';
  if (n === 0) return 'sıfır';
  const parts: string[] = [];
  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const remainder = Math.floor(n % 1_000);
  if (billions > 0) parts.push(threeDigitsTr(billions) + ' milyar');
  if (millions > 0) parts.push(threeDigitsTr(millions) + ' milyon');
  if (thousands > 0) parts.push(threeDigitsTr(thousands) + ' bin');
  if (remainder > 0) parts.push(threeDigitsTr(remainder));
  return parts.join(' ');
}

function currencyNameTr(currency: string): string {
  const map: Record<string, string> = {
    USD: 'ABD Doları', EUR: 'Euro', RUB: 'Rus Rublesi',
    KZT: 'Kazak Tengesi', UZS: 'Özbek Somu', TRY: 'Türk Lirası',
  };
  return map[currency] || currency;
}

// ─── Locale-aware formatter ─────────────────────────────────────────────────

/**
 * Formats a contract amount in the given language.
 * lang: 'ru' | 'en' | 'tr'
 */
export function formatContractAmountLocale(amountStr: string, currency: string, lang: 'ru' | 'en' | 'tr'): string {
  const cleaned = amountStr.replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  if (!amountStr || isNaN(num)) {
    if (lang === 'en') return `____________ (________________) ${currencyNameEn(currency || 'USD')}`;
    if (lang === 'tr') return `____________ (________________) ${currencyNameTr(currency || 'USD')}`;
    return `____________ (________________) ${currencyName(currency || 'USD', 0)}`;
  }
  const intPart = Math.floor(num);
  const formatted = formatNumberRu(intPart); // same numeric formatting for all
  if (lang === 'en') return `${formatted} (${numberToWordsEn(intPart)}) ${currencyNameEn(currency || 'USD')}`;
  if (lang === 'tr') return `${formatted} (${numberToWordsTr(intPart)}) ${currencyNameTr(currency || 'USD')}`;
  return `${formatted} (${numberToWordsRu(intPart)}) ${currencyName(currency || 'USD', intPart)}`;
}

/**
 * Formats a contract amount with both number and words, plus currency name.
 * E.g. formatContractAmount("1000000", "USD")
 * → "1 000 000 (один миллион) долларов США"
 */
export function formatContractAmount(amountStr: string, currency: string): string {
  // Remove all non-numeric characters except dot/comma for decimals
  const cleaned = amountStr.replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(cleaned);

  if (!amountStr || isNaN(num)) {
    // Return placeholder
    return `____________ (________________) ${currencyName(currency || 'USD', 0)}`;
  }

  const intPart = Math.floor(num);
  const formatted = formatNumberRu(intPart);
  const words = numberToWordsRu(intPart);
  const cName = currencyName(currency || 'USD', intPart);

  return `${formatted} (${words}) ${cName}`;
}
