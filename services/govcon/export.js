'use strict';

const SECRET_PATTERNS = [/api[_-]?key\s*[:=]\s*["']?[^"'\s,}]+/ig, /authorization\s*[:=]\s*bearer\s+[^"'\s,}]+/ig, /sk-[A-Za-z0-9_-]{10,}/g];

function createExport(input) {
  input = input || {};
  const format = String(input.format || 'markdown').toLowerCase();
  const payload = stripSecrets(input.payload || {});
  const title = String(input.title || input.kind || 'SourceDeck Export').slice(0, 120);
  let content, mime, extension;
  if (format === 'csv') {
    content = toCsv(payload); mime = 'text/csv'; extension = 'csv';
  } else if (format === 'xlsx') {
    content = toCsv(payload); mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; extension = 'xlsx';
  } else if (format === 'pdf') {
    content = pseudoPdf(title, payload); mime = 'application/pdf'; extension = 'pdf';
  } else {
    content = toMarkdown(title, payload); mime = 'text/markdown'; extension = 'md';
  }
  return {
    ok: true,
    id: `export_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    kind: input.kind || 'govcon',
    format,
    filename: safeFile(title) + '.' + extension,
    mime,
    content: scrubText(content),
    createdAt: new Date().toISOString()
  };
}

function stripSecrets(value) {
  if (Array.isArray(value)) return value.map(stripSecrets);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (/api[_-]?key|authorization|secret|token|credential/i.test(k)) continue;
      out[k] = stripSecrets(v);
    }
    return out;
  }
  return typeof value === 'string' ? scrubText(value) : value;
}

function scrubText(text) {
  let out = String(text == null ? '' : text);
  for (const re of SECRET_PATTERNS) out = out.replace(re, '[redacted]');
  return out;
}

function toMarkdown(title, payload) {
  return `# ${title}\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\`\n`;
}

function toCsv(payload) {
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload.results) ? payload.results : Array.isArray(payload.rows) ? payload.rows : [payload];
  const keys = Array.from(rows.reduce((s, r) => { Object.keys(flatten(r)).forEach(k => s.add(k)); return s; }, new Set()));
  return [keys.join(','), ...rows.map(r => keys.map(k => csvCell(flatten(r)[k])).join(','))].join('\n');
}

function pseudoPdf(title, payload) {
  return `%PDF-SourceDeck\n${title}\n${JSON.stringify(payload, null, 2)}\n%%EOF`;
}

function flatten(obj, prefix, out) {
  out = out || {};
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    out[prefix || 'value'] = Array.isArray(obj) ? obj.join('; ') : obj;
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = Array.isArray(v) ? v.join('; ') : v;
  }
  return out;
}

function csvCell(v) {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function safeFile(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sourcedeck-export'; }

module.exports = { createExport, stripSecrets, scrubText };
