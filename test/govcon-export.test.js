'use strict';
const assert = require('assert');
const { createExport, stripSecrets } = require('../services/govcon/export');

const payload = { title:'Opp', apiKey:'SECRET', nested:{ Authorization:'Bearer SECRET' }, rows:[{ a:1, b:'x' }] };
const md = createExport({ title:'Solicitation Analysis', format:'markdown', payload });
assert.strictEqual(md.format, 'markdown');
assert.ok(!/SECRET|apiKey|Bearer/.test(md.content));

const csv = createExport({ title:'Rows', format:'csv', payload:{ rows:[{ a:1, b:'x,y' }] } });
assert.match(csv.content, /"x,y"/);
const xlsx = createExport({ title:'Rows', format:'xlsx', payload:{ rows:[{ a:1 }] } });
assert.match(xlsx.mime, /spreadsheet/);
const pdf = createExport({ title:'Rows', format:'pdf', payload:{ a:1 } });
assert.ok(pdf.content.startsWith('%PDF-SourceDeck'));
assert.strictEqual(stripSecrets({ token:'x', keep:'y' }).token, undefined);
console.log('=== PASS govcon-export ===');
