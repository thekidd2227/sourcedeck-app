'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sourcedeck.html'), 'utf8');
const preload = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8');
const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');

assert.ok(/id="settings-govcon-index"/.test(html), 'GovCon Data Index settings exist');
assert.ok(/id="gc-index-enabled"/.test(html), 'enable/disable daily index control exists');
assert.ok(/id="gc-index-max-records"/.test(html), 'max records cap control exists');
assert.ok(/gcIndexClear/.test(html) && /gcIndexRebuild/.test(html), 'clear/rebuild controls exist');
assert.ok(/Estimated|Storage|estimatedStorageLabel/.test(html + main), 'storage estimate is displayed');
assert.ok(/data-dash-card="govcon-index"/.test(html), 'Dashboard GovCon Index card exists');
assert.ok(/govcon:index-run-now/.test(preload + main), 'Run Index Now IPC exists');
assert.ok(/govcon:index-settings-save/.test(preload + main), 'settings save IPC exists');
console.log('Phase 25AA index settings: OK');
