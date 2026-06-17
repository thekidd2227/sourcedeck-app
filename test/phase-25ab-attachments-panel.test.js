const assert = require('assert');
const fs = require('fs');
const html = fs.readFileSync('sourcedeck.html', 'utf8');

assert.ok(/Download Solicitation Package/.test(html), 'download package control exists');
assert.ok(/View Attachments/.test(html), 'view attachments control exists');
assert.ok(/Send Package to Solicitation Center/.test(html), 'send package to Solicitation Center control exists');
assert.ok(/data-gc-ab-attachment-row/.test(html), 'attachments panel renders downloaded attachment rows');
assert.ok(/View<\/button>/.test(html), 'attachment View action exists');
assert.ok(/Extract Text/.test(html), 'attachment Extract Text action exists');
assert.ok(/Include in Analysis|Exclude from Analysis/.test(html), 'include/exclude actions exist');
assert.ok(/Open Local File/.test(html), 'open local file action exists');
assert.ok(/openSolicitationPackageFolder/.test(html) && /govcon:open-solicitation-package-folder/.test(fs.readFileSync('preload.js', 'utf8') + fs.readFileSync('main.js', 'utf8')), 'open local package folder bridge exists');
console.log('phase-25ab-attachments-panel: ok');
