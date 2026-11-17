import api from './api';

const BLOB = { responseType: 'blob', headers: { 'Content-Type': undefined } };

export async function pdfToText(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/api/convert/pdf-data/pdf-to-text', fd, BLOB);
  return data;
}

export async function pdfToCsv(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/api/convert/pdf-data/pdf-to-csv', fd, BLOB);
  return data;
}

export async function pdfToExcel(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/api/convert/pdf-data/pdf-to-excel', fd, BLOB);
  return data;
}
