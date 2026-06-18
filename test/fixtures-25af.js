'use strict';

// Phase 25AF — shared fixture builders for real-package extraction tests.
// All builders are pure (no native deps) and produce files the extraction
// engine must read with built-in zlib only.

const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

function tmpDir(tag) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sd-25af-' + (tag || 'pkg') + '-'));
}

// Minimal ZIP writer using the STORED method (0) so the project's built-in
// extractZip reader (method 0 / 8) can read it without a central directory.
function buildStoredZip(entries) {
  const chunks = [];
  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8');
    const data = Buffer.isBuffer(e.data) ? e.data : Buffer.from(String(e.data), 'utf8');
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt16LE(20, 4);
    h.writeUInt16LE(0, 6);
    h.writeUInt16LE(0, 8); // method = stored
    h.writeUInt16LE(0, 10);
    h.writeUInt16LE(0, 12);
    h.writeUInt32LE(0, 14); // crc (reader ignores)
    h.writeUInt32LE(data.length, 18);
    h.writeUInt32LE(data.length, 22);
    h.writeUInt16LE(name.length, 26);
    h.writeUInt16LE(0, 28);
    chunks.push(h, name, data);
  }
  return Buffer.concat(chunks);
}

function buildDocx(paragraphs) {
  const body = paragraphs.map(p =>
    '<w:p><w:r><w:t xml:space="preserve">' +
    String(p).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
    '</w:t></w:r></w:p>'
  ).join('');
  const documentXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:body>' + body + '</w:body></w:document>';
  return buildStoredZip([
    { name: '[Content_Types].xml', data: '<?xml version="1.0"?><Types/>' },
    { name: 'word/document.xml', data: documentXml }
  ]);
}

// rows: array of arrays; first row treated as header. Each cell is a string or
// {n: number} for a numeric cell.
function buildXlsx(sheetName, rows) {
  const strings = [];
  const idxOf = (v) => {
    const s = String(v);
    let i = strings.indexOf(s);
    if (i < 0) { i = strings.length; strings.push(s); }
    return i;
  };
  const colLetter = (i) => String.fromCharCode(65 + i);
  const rowXml = rows.map((cells, r) => {
    const cellXml = cells.map((cell, c) => {
      const ref = colLetter(c) + (r + 1);
      if (cell && typeof cell === 'object' && 'n' in cell) {
        return '<c r="' + ref + '"><v>' + cell.n + '</v></c>';
      }
      return '<c r="' + ref + '" t="s"><v>' + idxOf(cell) + '</v></c>';
    }).join('');
    return '<row r="' + (r + 1) + '">' + cellXml + '</row>';
  }).join('');
  const sheetXml =
    '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetData>' + rowXml + '</sheetData></worksheet>';
  const sstXml =
    '<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    strings.map(s => '<si><t xml:space="preserve">' +
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</t></si>').join('') +
    '</sst>';
  const workbookXml =
    '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheets><sheet name="' + sheetName + '" sheetId="1" r:id="rId1"/></sheets></workbook>';
  return buildStoredZip([
    { name: '[Content_Types].xml', data: '<?xml version="1.0"?><Types/>' },
    { name: 'xl/workbook.xml', data: workbookXml },
    { name: 'xl/sharedStrings.xml', data: sstXml },
    { name: 'xl/worksheets/sheet1.xml', data: sheetXml }
  ]);
}

// Minimal single-page PDF. When compress=true the content stream is
// FlateDecode-compressed (zlib), otherwise it is left raw.
function buildPdf(lines, compress) {
  const ops = ['BT', '/F1 12 Tf', '72 720 Td'];
  lines.forEach((ln, i) => {
    if (i > 0) ops.push('0 -16 Td');
    ops.push('(' + String(ln).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)') + ') Tj');
  });
  ops.push('ET');
  const contentStr = ops.join('\n');
  const contentBuf = compress ? zlib.deflateSync(Buffer.from(contentStr, 'latin1')) : Buffer.from(contentStr, 'latin1');
  const filter = compress ? ' /Filter /FlateDecode' : '';

  const parts = [];
  const offsets = [];
  let pdf = '%PDF-1.4\n';
  function obj(n, body) {
    offsets[n] = Buffer.byteLength(pdf, 'latin1');
    pdf += n + ' 0 obj\n' + body + '\nendobj\n';
  }
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
  // object 4 (content stream) written manually to embed binary
  offsets[4] = Buffer.byteLength(pdf, 'latin1');
  const head = '4 0 obj\n<< /Length ' + contentBuf.length + filter + ' >>\nstream\n';
  const tail = '\nendstream\nendobj\n';
  const buf = Buffer.concat([
    Buffer.from(pdf, 'latin1'),
    Buffer.from(head, 'latin1'),
    contentBuf,
    Buffer.from(tail, 'latin1')
  ]);
  let pdf2 = buf.toString('latin1');
  // append font object + trailer
  const fontStart = Buffer.byteLength(pdf2, 'latin1');
  offsets[5] = fontStart;
  pdf2 += '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  const xrefStart = Buffer.byteLength(pdf2, 'latin1');
  pdf2 += 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i += 1) pdf2 += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  pdf2 += 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF';
  return Buffer.from(pdf2, 'latin1');
}

// Build a downloaded-style package directory + manifest the extraction
// engine can resolve. files: [{name, data:Buffer}].
function buildPackage(tag, files) {
  const root = tmpDir(tag);
  const attachments = path.join(root, 'attachments');
  fs.mkdirSync(attachments, { recursive: true });
  const manifestFiles = [];
  for (const f of files) {
    const local = path.join(attachments, f.name);
    fs.writeFileSync(local, Buffer.isBuffer(f.data) ? f.data : Buffer.from(String(f.data)));
    manifestFiles.push({ fileName: f.name, localPath: local, status: 'downloaded' });
  }
  const manifest = { packagePath: root, noticeId: tag, solicitationNumber: 'TEST-' + tag, files: manifestFiles };
  return { root, manifest };
}

module.exports = { tmpDir, buildStoredZip, buildDocx, buildXlsx, buildPdf, buildPackage };
