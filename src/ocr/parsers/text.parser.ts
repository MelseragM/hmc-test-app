export function normalizeOcrText(text: string) {
  return text
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function findLabeledValue(
  lines: string[],
  labels: string[],
  options: { includeNextLine?: boolean } = {},
) {
  for (const [index, line] of lines.entries()) {
    for (const label of labels) {
      const escapedLabel = escapeRegex(label);
      const inlineMatch = line.match(
        new RegExp(`${escapedLabel}\\s*(?:[:.#-]|number|no)?\\s*(.+)$`, 'i'),
      );

      if (inlineMatch?.[1]?.trim()) {
        return cleanValue(inlineMatch[1]);
      }

      if (
        options.includeNextLine &&
        new RegExp(`^${escapedLabel}\\b`, 'i').test(line) &&
        lines[index + 1]
      ) {
        return cleanValue(lines[index + 1]);
      }
    }
  }

  return undefined;
}

export function findDateByLabels(lines: string[], labels: string[]) {
  const value = findLabeledValue(lines, labels, { includeNextLine: true });
  if (value) {
    return value;
  }

  const labelPattern = labels.map(escapeRegex).join('|');
  const text = lines.join('\n');
  const match = text.match(
    new RegExp(
      `(?:${labelPattern})[^\\dA-Za-z]{0,20}((?:\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{2,4})|(?:\\d{4}[-/]\\d{1,2}[-/]\\d{1,2})|(?:\\d{1,2}\\s+[A-Za-z]{3,9}\\s+\\d{2,4}))`,
      'i',
    ),
  );

  return match?.[1];
}

export function cleanValue(value: string) {
  return value.replace(/\s+/g, ' ').replace(/^[.:#\-\s]+/, '').trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
