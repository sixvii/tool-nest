export const CSV_PREVIEW_ROW_LIMIT = 50;

export function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

export function parseCsvPreview(text, maxRows = CSV_PREVIEW_ROW_LIMIT) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const rows = lines.slice(0, maxRows).map(parseCsvLine);
  return { rows, totalRows: lines.length, truncated: lines.length > maxRows };
}

export function csvTextToBlob(csvText) {
  return new Blob([csvText], { type: 'text/csv;charset=utf-8' });
}

export function buildCsvResult(csvText, baseName) {
  return {
    blob: csvTextToBlob(csvText),
    resultName: `${baseName}.csv`,
    csvPreview: parseCsvPreview(csvText),
  };
}

export function xmlInputToFile(xmlInput, fileName = 'input.xml') {
  return new File([xmlInput], fileName, { type: 'application/xml' });
}

export function getBaseNameFromFile(file) {
  return file?.name.replace(/\.[^/.]+$/, '') || 'data';
}
