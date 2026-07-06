import { QidFields } from '../types/ocr.types';
import { parseLooseDate } from './date.parser';
import { findDateByLabels, findLabeledValue, normalizeOcrText } from './text.parser';

export function parseQidText(text: string): QidFields {
  const lines = normalizeOcrText(text);

  return withEmptyQidFields({
    issuingState: findIssuingState(lines),
    documentType: findDocumentType(lines),
    qidNumber: findQidNumber(lines),
    name: findName(lines),
    dateOfBirth: parseLooseDate(
      findDateAfterLabel(lines, ['date of birth', 'birth date', 'd.o.b', 'dob']),
    ),
    nationality: findValueAfterLabel(lines, ['nationality']),
    issueDate: parseLooseDate(
      findDateAfterLabel(lines, ['date of issue', 'issue date', 'issued']),
    ),
    expiryDate: parseLooseDate(
      findDateAfterLabel(lines, ['date of expiry', 'expiry date', 'expires', 'expiry']),
    ),
  });
}

function findQidNumber(lines: string[]) {
  const labeled = findLabeledValue(lines, [
    'qid',
    'qid no',
    'id no',
    'id number',
    'personal number',
  ]);
  const labeledMatch = labeled?.match(/\b\d{11}\b/);
  if (labeledMatch) {
    return labeledMatch[0];
  }

  const text = lines.join('\n');
  const match = text.match(/\b\d{11}\b/);

  return match?.[0];
}

function findName(lines: string[]) {
  const inline = findLabeledValue(lines, ['name', 'full name']);
  if (inline) {
    return inline;
  }

  return findValueAfterLabel(lines, ['name', 'full name']);
}

function findIssuingState(lines: string[]) {
  return lines.find((line) => /state\s+of\s+qatar/i.test(line));
}

function findDocumentType(lines: string[]) {
  return lines.find((line) => /residency\s*permit/i.test(line));
}

function findDateAfterLabel(lines: string[], labels: string[]) {
  const labeledDate = findDateByLabels(lines, labels);
  if (parseLooseDate(labeledDate)) {
    return labeledDate;
  }

  const value = findValueAfterLabel(lines, labels, {
    pattern: /\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/,
  });

  return value;
}

function findValueAfterLabel(
  lines: string[],
  labels: string[],
  options: { pattern?: RegExp } = {},
) {
  for (const [index, line] of lines.entries()) {
    const matched = labels.some((label) => matchesLabel(line, label));
    if (!matched) {
      continue;
    }

    const inline = extractInlineValue(line);
    if (inline && isUsefulValue(inline, options.pattern)) {
      return inline;
    }

    for (const candidate of lines.slice(index + 1, index + 5)) {
      if (isUsefulValue(candidate, options.pattern)) {
        return candidate;
      }
    }
  }

  return undefined;
}

function matchesLabel(line: string, label: string) {
  const normalizedLine = normalizeLabel(line);
  const normalizedLabel = normalizeLabel(label);

  return normalizedLine.includes(normalizedLabel);
}

function normalizeLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function extractInlineValue(line: string) {
  const parts = line.split(':');
  if (parts.length < 2) {
    return undefined;
  }

  return parts.slice(1).join(':').trim();
}

function isUsefulValue(value: string, pattern?: RegExp) {
  const trimmed = value.trim();
  if (!trimmed || /^[^\dA-Za-z]+$/.test(trimmed)) {
    return false;
  }

  if (pattern) {
    return pattern.test(trimmed);
  }

  return !/^(occupation|nationality|expiry|name|d\.?o\.?b\.?)[:\s]*$/i.test(
    trimmed,
  );
}

function withEmptyQidFields(fields: QidFields): Required<QidFields> {
  return {
    issuingState: fields.issuingState ?? '',
    documentType: fields.documentType ?? '',
    qidNumber: fields.qidNumber ?? '',
    name: fields.name ?? '',
    dateOfBirth: fields.dateOfBirth ?? '',
    nationality: fields.nationality ?? '',
    issueDate: fields.issueDate ?? '',
    expiryDate: fields.expiryDate ?? '',
  };
}
