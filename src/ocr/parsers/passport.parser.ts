import { PassportFields } from '../types/ocr.types';
import { parseLooseDate, parseMrzDate } from './date.parser';
import {
  findDateByLabels,
  findLabeledValue,
  normalizeOcrText,
} from './text.parser';

export function parsePassportText(text: string): PassportFields {
  const lines = normalizeOcrText(text);
  const mrzFields = parsePassportMrz(lines);
  const fallbackFields = parsePassportLabels(lines);

  return withEmptyPassportFields({
    ...fallbackFields,
    ...mrzFields,
  });
}

function parsePassportMrz(lines: string[]): PassportFields {
  const mrzLines = lines
    .map((line) => line.toUpperCase().replace(/\s/g, ''))
    .filter((line) => /^[A-Z0-9<]{30,}$/.test(line));
  const firstLineIndex = mrzLines.findIndex((line) => /^P[A-Z<]/.test(line));

  if (firstLineIndex === -1 || !mrzLines[firstLineIndex + 1]) {
    return {};
  }

  const line1 = mrzLines[firstLineIndex].padEnd(44, '<').slice(0, 44);
  const line2 = mrzLines[firstLineIndex + 1].padEnd(44, '<').slice(0, 44);
  const names = parseMrzNames(line1.slice(5));

  return {
    documentType: cleanMrzValue(line1.slice(0, 2)),
    passportNumber: cleanMrzValue(line2.slice(0, 9)),
    countryCode: cleanMrzValue(line1.slice(2, 5)),
    issuingCountry: cleanMrzValue(line1.slice(2, 5)),
    nationality: cleanMrzValue(line2.slice(10, 13)),
    ...names,
    dateOfBirth: parseMrzDate(line2.slice(13, 19), 'birth'),
    sex: cleanMrzValue(line2.slice(20, 21)),
    expiryDate: parseMrzDate(line2.slice(21, 27), 'expiry'),
    personalNumber: cleanMrzValue(line2.slice(28, 42)),
  };
}

function parseMrzNames(value: string) {
  const [surname, givenNames] = value.split('<<');

  return {
    surname: cleanMrzValue(surname),
    givenNames: cleanMrzValue(givenNames),
  };
}

function parsePassportLabels(lines: string[]): PassportFields {
  const issueAndExpiryDates = findIssueAndExpiryDates(lines);
  const dateOfBirth = parseLooseDate(
    findDateAfterLabel(lines, ['date of birth', 'birth date', 'dob']),
  );
  const issueDate =
    parseLooseDate(findDateAfterLabel(lines, ['date of issue', 'issue date'])) ??
    issueAndExpiryDates.issueDate;
  const expiryDate =
    parseLooseDate(
      findDateAfterLabel(lines, ['date of expiry', 'expiry date', 'expires']),
    ) ?? issueAndExpiryDates.expiryDate;

  return {
    documentType: findValueAfterLabel(lines, ['type'], {
      pattern: /^[A-Z]{1,2}$/,
    }),
    passportNumber:
      findPassportNumber(lines) ??
      findLabeledValue(lines, ['passport no', 'passport number', 'document no']),
    countryCode: findValueAfterLabel(lines, ['country code'], {
      pattern: /^[A-Z]{3}$/,
    }),
    issuingCountry: findLabeledValue(lines, [
      'issuing country',
      'country of issue',
      'authority',
    ]),
    nationality: findLabeledValue(lines, ['nationality']),
    name: findValueAfterLabel(lines, ['name', 'full name'], {
      minimumLetters: 3,
    }),
    surname: findLabeledValue(lines, ['surname', 'last name']),
    givenNames: findLabeledValue(lines, [
      'given names',
      'given name',
      'first name',
    ]),
    occupation: findValueAfterLabel(lines, ['occupation', 'profession'], {
      minimumLetters: 3,
    }),
    personalNumber: findValueAfterLabel(lines, ['personal no', 'personal n°'], {
      pattern: /^\d{6,15}$/,
    }),
    dateOfBirth,
    sex: findValueAfterLabel(lines, ['sex', 'gender'], {
      pattern: /^[MF]$/,
    }),
    placeOfBirth: findValueAfterLabel(lines, ['place of birth'], {
      minimumLetters: 3,
    }),
    issueDate,
    dateOfIssue: issueDate,
    expiryDate,
  };
}

function findIssueAndExpiryDates(lines: string[]) {
  const issueLabelIndex = lines.findIndex((line) =>
    /date\s+of\s+issue|issue\s+date/i.test(line),
  );
  const expiryLabelIndex = lines.findIndex((line) =>
    /date\s+of\s+expiry|expiry\s+date|expires/i.test(line),
  );

  if (issueLabelIndex === -1 || expiryLabelIndex === -1) {
    return {};
  }

  const startIndex = Math.min(issueLabelIndex, expiryLabelIndex) + 1;
  const candidateText = lines.slice(startIndex, startIndex + 4).join(' ');
  const dates = findLooseDateCandidates(candidateText).map(parseLooseDate);
  const [firstDate, secondDate] = dates.filter(
    (date): date is string => Boolean(date),
  );

  if (issueLabelIndex <= expiryLabelIndex) {
    return {
      issueDate: firstDate,
      expiryDate: secondDate,
    };
  }

  return {
    issueDate: secondDate,
    expiryDate: firstDate,
  };
}

function findLooseDateCandidates(text: string) {
  return [
    ...text.matchAll(
      /\b(?:\d{8}|\d{1,2}\s+\d{1,2}\s+\d{4}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})\b/g,
    ),
  ].map((match) => match[0]);
}

function findPassportNumber(lines: string[]) {
  const afterLabel = findValueAfterLabel(lines, ['passport no', 'passport number'], {
    pattern: /^[A-Z0-9]{6,12}$/,
  });
  if (afterLabel) {
    return afterLabel.toUpperCase();
  }

  const text = lines.join('\n');
  const match = text.match(/\b([A-Z]\d[A-Z0-9]{4,10})\b/i);

  return match?.[1]?.toUpperCase();
}

function cleanMrzValue(value: string | undefined) {
  const cleaned = value?.replace(/</g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned || undefined;
}

function findDateAfterLabel(lines: string[], labels: string[]) {
  const labeledDate = findDateByLabels(lines, labels);
  if (parseLooseDate(labeledDate)) {
    return labeledDate;
  }

  const labelIndex = findLabelIndex(lines, labels);
  if (labelIndex === -1) {
    return undefined;
  }

  const candidateText = lines.slice(labelIndex + 1, labelIndex + 6).join(' ');
  return findLooseDateCandidates(candidateText)[0];
}

function findValueAfterLabel(
  lines: string[],
  labels: string[],
  options: { pattern?: RegExp; minimumLetters?: number } = {},
) {
  const labelIndex = findLabelIndex(lines, labels);
  if (labelIndex === -1) {
    return undefined;
  }

  for (const line of lines.slice(labelIndex + 1, labelIndex + 8)) {
    const value = line.trim();
    if (!isUsefulValue(value, options)) {
      continue;
    }

    return value;
  }

  return undefined;
}

function findLabelIndex(lines: string[], labels: string[]) {
  return lines.findIndex((line) =>
    labels.some((label) =>
      new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(line),
    ),
  );
}

function isUsefulValue(
  value: string,
  options: { pattern?: RegExp; minimumLetters?: number },
) {
  if (!value || /^[^\dA-Za-z]+$/.test(value)) {
    return false;
  }

  if (options.pattern) {
    return options.pattern.test(value);
  }

  const letterCount = (value.match(/[A-Za-z]/g) ?? []).length;
  return letterCount >= (options.minimumLetters ?? 1);
}

function withEmptyPassportFields(fields: PassportFields): Required<PassportFields> {
  return {
    documentType: fields.documentType ?? '',
    passportNumber: fields.passportNumber ?? '',
    countryCode: fields.countryCode ?? '',
    issuingCountry: fields.issuingCountry ?? '',
    nationality: fields.nationality ?? '',
    name: fields.name ?? '',
    surname: fields.surname ?? '',
    givenNames: fields.givenNames ?? '',
    occupation: fields.occupation ?? '',
    personalNumber: fields.personalNumber ?? '',
    dateOfBirth: fields.dateOfBirth ?? '',
    sex: fields.sex ?? '',
    placeOfBirth: fields.placeOfBirth ?? '',
    expiryDate: fields.expiryDate ?? '',
    issueDate: fields.issueDate ?? '',
    dateOfIssue: fields.dateOfIssue ?? fields.issueDate ?? '',
  };
}
