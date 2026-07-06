const MONTHS: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
};

export function parseMrzDate(value: string, mode: 'birth' | 'expiry') {
  if (!/^\d{6}$/.test(value)) {
    return undefined;
  }

  const year = Number(value.slice(0, 2));
  const month = value.slice(2, 4);
  const day = value.slice(4, 6);
  const currentYear = new Date().getFullYear() % 100;
  const century = mode === 'birth' && year > currentYear ? 1900 : 2000;

  return toIsoDate(String(century + year), month, day);
}

export function parseLooseDate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/[,]/g, ' ').replace(/\s+/g, ' ').trim();
  const isoMatch = normalized.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoMatch) {
    return toIsoDate(isoMatch[1], isoMatch[2], isoMatch[3]);
  }

  const numericMatch = normalized.match(
    /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/,
  );
  if (numericMatch) {
    const year = normalizeYear(numericMatch[3]);
    return toIsoDate(year, numericMatch[2], numericMatch[1]);
  }

  const spacedNumericMatch = normalized.match(/\b(\d{1,2})\s+(\d{1,2})\s+(\d{4})\b/);
  if (spacedNumericMatch) {
    return toIsoDate(
      spacedNumericMatch[3],
      spacedNumericMatch[2],
      spacedNumericMatch[1],
    );
  }

  const compactNumericMatch = normalized.match(/\b(\d{8})\b/);
  if (compactNumericMatch) {
    return parseCompactDate(compactNumericMatch[1]);
  }

  const namedMonthMatch = normalized.match(
    /\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})\b/,
  );
  if (namedMonthMatch) {
    const month = MONTHS[namedMonthMatch[2].toLowerCase()];
    if (month) {
      return toIsoDate(
        normalizeYear(namedMonthMatch[3]),
        month,
        namedMonthMatch[1],
      );
    }
  }

  return undefined;
}

function parseCompactDate(value: string) {
  const possibleYear = Number(value.slice(0, 4));
  if (possibleYear >= 1900 && possibleYear <= 2099) {
    return toIsoDate(value.slice(0, 4), value.slice(4, 6), value.slice(6, 8));
  }

  return toIsoDate(value.slice(4, 8), value.slice(2, 4), value.slice(0, 2));
}

function normalizeYear(value: string) {
  if (value.length === 4) {
    return value;
  }

  const year = Number(value);
  return String(year > 40 ? 1900 + year : 2000 + year);
}

function toIsoDate(year: string, month: string, day: string) {
  const paddedMonth = month.padStart(2, '0');
  const paddedDay = day.padStart(2, '0');

  if (!isValidDate(year, paddedMonth, paddedDay)) {
    return undefined;
  }

  return `${year}-${paddedMonth}-${paddedDay}`;
}

function isValidDate(year: string, month: string, day: string) {
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const date = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber));

  return (
    date.getUTCFullYear() === yearNumber &&
    date.getUTCMonth() === monthNumber - 1 &&
    date.getUTCDate() === dayNumber
  );
}
