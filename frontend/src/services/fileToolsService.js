import api from './api';

const BLOB = { responseType: 'blob', headers: { 'Content-Type': undefined } };

export async function csvToExcel(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/api/file/csv-to-excel', fd, BLOB);
  return data;
}

export async function excelToCsv(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/api/file/excel-to-csv', fd, BLOB);
  return data;
}

export async function splitCsv(file, rowsPerFile) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('rows_per_file', rowsPerFile);
  const { data } = await api.post('/api/file/split-csv', fd, BLOB);
  return data;
}

export async function splitExcel(file, rowsPerFile) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('rows_per_file', rowsPerFile);
  const { data } = await api.post('/api/file/split-excel', fd, BLOB);
  return data;
}

// ─── Structured Data Tools (/api/convert/data/) ───────────────────────────────

export async function xmlToCsv(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/api/convert/data/xml-to-csv', fd, BLOB);
  return data;
}

export async function jsonToXml(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/api/convert/data/json-to-xml', fd, BLOB);
  return data;
}

export async function xmlToJson(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/api/convert/data/xml-to-json', fd, BLOB);
  return data;
}
export async function csvToJson(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/api/convert/data/csv-to-json', fd, BLOB);
  return data;
}

export async function jsonToCsv(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/api/convert/data/json-to-csv', fd, BLOB);
  return data;
}

export async function convertCsvToXml(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/api/convert/data/csv-to-xml', fd, BLOB);
  return data;
}

export async function convertExcelToXml(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/api/convert/data/excel-to-xml', fd, BLOB);
  return data;
}

export async function convertXmlToExcel(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/api/convert/data/xml-to-excel', fd, BLOB);
  return data;
}
