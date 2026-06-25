'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const { importAndExtract } = require(path.join(ROOT, 'services/govcon/solicitation-import'));
const summarizeSvc = require(path.join(ROOT, 'services/govcon/solicitation-summarize'));
const { summarizeSolicitation, explainSection, AREA_DEFINITIONS, SCHEMA_VERSION, STATUS } = summarizeSvc;

let pass = 0;
let fail = 0;
function check(label, condition, detail) {
  if (condition) {
    pass += 1;
    console.log('  ✅ ' + label);
    return;
  }
  fail += 1;
  console.log('  ❌ ' + label + (detail ? ' → ' + detail : ''));
}

const FAR_RFQ = [
  'SOLICITATION/CONTRACT/ORDER FOR COMMERCIAL ITEMS',
  'RFQ Number: 75D301-26-Q-00942',
  'Title: Janitorial Services — Building 14',
  'Issuing Agency: Department of Health and Human Services',
  'Office: Office of Acquisition Services',
  'Questions Due: 2026-06-22 5:00 PM EDT',
  'Quote Due: 2026-06-29 2:00 PM EDT',
  'Place of Performance: 1600 Clifton Rd NE, Atlanta GA 30329',
  'NAICS: 561720',
  'PSC: S201',
  'Set-Aside: SDVOSB',
  '',
  'ADDENDUM TO FAR 52.212-1 — INSTRUCTIONS TO OFFERORS',
  'Submit quote by email as one PDF. Provide pricing on Attachment 1.',
  '',
  'ADDENDUM TO FAR 52.212-2 — EVALUATION FACTORS FOR AWARD',
  'Best value: Technical Approach, Past Performance, Price.',
  '',
  'PERFORMANCE REQUIREMENTS SUMMARY',
  'The contractor shall provide janitorial services for Building 14.',
  '',
  'LIST OF ATTACHMENTS',
  'Attachment 1 — Pricing Sheet',
  'Attachment 2 — Wage Determination 2015-5634 Rev 15',
  '',
  'CONTRACT CLAUSES',
  'FAR 52.204-7 System for Award Management',
  'FAR 52.219-14 Limitations on Subcontracting'
].join('\n');

function findArea(summary, key) {
  return (summary.areas || []).find(area => area.key === key);
}

async function testRendererDoesNotOverwriteSource(extraction) {
  const modulePath = path.join(ROOT, 'app/renderer/features/solicitation-center/summarize-and-explain.js');
  const src = fs.readFileSync(modulePath, 'utf8');
  const elements = {};
  function makeElement(id) {
    return {
      id,
      innerHTML: '',
      style: {},
      parentNode: null,
      nextSibling: null,
      setAttribute() {},
      insertAdjacentElement(_where, child) {
        elements[child.id] = child;
        child.parentNode = this.parentNode;
      }
    };
  }
  const target = makeElement('gc-sol-section-l');
  target.innerHTML = 'ORIGINAL SECTION L SOURCE TEXT';
  elements[target.id] = target;
  const ctx = {
    console,
    setTimeout,
    clearTimeout,
    localStorage: { getItem() { return 'opp-25as-1'; } },
    document: {
      getElementById(id) { return elements[id] || null; },
      createElement() { return makeElement('dynamic'); }
    }
  };
  ctx.window = ctx;
  ctx.window.gcSolLoadState = () => ({ packageExtraction: extraction });
  ctx.window.activeSolId = () => 'opp-25as-1';
  ctx.window.toast = () => {};
  ctx.window.sd = {
    govcon: {
      solicitation: {
        explainSection: async payload => explainSection(payload),
        summarize: async payload => summarizeSolicitation(payload)
      }
    }
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: modulePath });
  await ctx.window.gcSolExplainSection('L', 'gc-sol-section-l');
  check('renderer keeps the original Section L source panel unchanged', target.innerHTML === 'ORIGINAL SECTION L SOURCE TEXT', target.innerHTML);
  const explain = elements['gc-sol-explain-l'];
  check('renderer creates a separate explanation panel', !!explain && /Submit quote by email/i.test(explain.innerHTML), explain && explain.innerHTML);
}

(async () => {
  console.log('\n=== Phase 25AS — Solicitation incident completion ===\n');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-25as-'));
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-25as-ud-'));
  const file = path.join(tmp, 'RFQ.txt');
  fs.writeFileSync(file, FAR_RFQ);

  const extraction = await importAndExtract({
    filePaths: [file],
    opportunity: { id: 'opp-25as-1', title: 'Janitorial Services — Building 14' },
    userDataPath: userData
  });

  check('import succeeds', extraction && extraction.ok === true, JSON.stringify(extraction).slice(0, 200));
  check('solicitation number is the actual RFQ number', extraction.metadata.solicitationNumber === '75D301-26-Q-00942', extraction.metadata.solicitationNumber);
  const forms = (extraction.requiredFormsAttachments || []).map(item => item && item.text || item || '');
  check('attachment label and description stay canonical', forms.some(x => /Attachment\s+1[\s—–\-:]+Pricing Sheet/i.test(x)), JSON.stringify(forms));
  check('attachment fragments are not duplicated', !forms.some(x => /^Attachment 1$|^Pricing Sheet$/i.test(String(x).trim())), JSON.stringify(forms));

  extraction.metadata.pointOfContact = [{
    name: 'Jane Contracting Officer',
    role: 'Contracting Officer',
    email: 'jane.co@example.mil',
    phone: '202-555-0100',
    sourceFile: 'RFQ.txt',
    sourceLocation: 'Cover page'
  }];
  extraction.metadata.pricingClinTable = [{
    clin: '0001',
    description: 'Base-year janitorial services',
    quantity: 12,
    unit: 'MO',
    sourceFile: 'Attachment 1 — Pricing Sheet.xlsx',
    sourceLocation: 'Sheet Pricing row 2'
  }];
  extraction.complianceMatrix = [{
    requirementText: 'Offeror must submit a technical approach and price volume.',
    section: 'L',
    mandatory: true,
    sourceFile: 'RFQ.txt',
    sourceLocation: 'Section L'
  }, {
    requirement: 'FAR 52.219-14 Limitations on Subcontracting applies.',
    sourceFile: 'RFQ.txt',
    sourceLocation: 'Contract Clauses'
  }];

  const summary = summarizeSolicitation({ extraction, opportunityId: 'opp-25as-1' });
  check('summary succeeds for the bound opportunity', summary.ok === true, JSON.stringify(summary).slice(0, 200));
  check('summary schema version is current', summary.schemaVersion === SCHEMA_VERSION && SCHEMA_VERSION >= 2, String(summary.schemaVersion));
  check('summary contains all documented areas', summary.areas.length === AREA_DEFINITIONS.length && summary.areas.length === 17, String(summary.areas.length));
  check('processing status is explicit', Object.values(STATUS).includes(summary.processingStatus), summary.processingStatus);

  const buyer = findArea(summary, 'who-is-buying');
  check('structured contact fields are preserved', /Jane Contracting Officer.*jane\.co@example\.mil.*202-555-0100/i.test(buyer.content), buyer.content);
  const pricing = findArea(summary, 'contract-pricing-structure');
  check('structured CLIN data is preserved', /CLIN 0001.*Base-year janitorial services.*Qty 12.*MO/i.test(pricing.content), pricing.content);
  const compliance = findArea(summary, 'mandatory-compliance');
  check('requirementText and requirement compliance shapes are preserved', /technical approach and price volume/i.test(compliance.content) && /52\.219-14/i.test(compliance.content), compliance.content);
  check('area provenance includes exact source files', compliance.sourceFiles.includes('RFQ.txt'), JSON.stringify(compliance.sourceFiles));
  check('summary source references include attachment pricing source', summary.sourceFiles.includes('Attachment 1 — Pricing Sheet.xlsx'), JSON.stringify(summary.sourceFiles));

  const mismatch = summarizeSolicitation({ extraction, opportunityId: 'opp-other' });
  check('cross-opportunity extraction is rejected', mismatch.ok === false && mismatch.reason === 'opportunity_mismatch', JSON.stringify(mismatch));
  const unbound = JSON.parse(JSON.stringify(extraction));
  delete unbound.import.opportunityId;
  const unboundResult = summarizeSolicitation({ extraction: unbound, opportunityId: 'opp-25as-1' });
  check('unbound legacy extraction is rejected for a selected opportunity', unboundResult.ok === false && unboundResult.reason === 'unbound_extraction', JSON.stringify(unboundResult));

  const failed = JSON.parse(JSON.stringify(extraction));
  failed.documentInventory = [{ originalFileName: 'scan.pdf', extractionStatus: 'ocr_required', sourceFile: 'scan.pdf' }];
  const failedSummary = summarizeSolicitation({ extraction: failed, opportunityId: 'opp-25as-1' });
  check('OCR-required documents surface extraction failure state', failedSummary.processingStatus === STATUS.EXTRACTION_FAILED, failedSummary.processingStatus);
  check('OCR-required state is called out in operator actions', /OCR-required|processing is extraction_failed|Resolve failed/i.test(findArea(failedSummary, 'immediate-actions').content), findArea(failedSummary, 'immediate-actions').content);

  const explained = explainSection({ extraction, opportunityId: 'opp-25as-1', section: 'L' });
  check('section explain uses actual extracted section text', explained.ok === true && /Submit quote by email/i.test(explained.explanation), JSON.stringify(explained).slice(0, 300));
  check('section explain returns source provenance', Array.isArray(explained.sourceReferences), JSON.stringify(explained.sourceReferences));
  const emptyAliasRecord = JSON.parse(JSON.stringify(extraction));
  emptyAliasRecord.requiredFormsAttachments = [];
  const emptyAlias = explainSection({ extraction: emptyAliasRecord, opportunityId: 'opp-25as-1', section: 'FORMS' });
  check('empty alias arrays report not_found instead of successful empty output', emptyAlias.ok === true && emptyAlias.status === STATUS.NOT_FOUND && !emptyAlias.explanation, JSON.stringify(emptyAlias));

  const rendererSource = fs.readFileSync(path.join(ROOT, 'app/renderer/features/solicitation-center/summarize-and-explain.js'), 'utf8');
  check('renderer module contains no direct Electron or ipcRenderer access', !/require\(['"]electron['"]\)|\bipcRenderer\b/.test(rendererSource));
  check('renderer creates a dedicated explain container', /gc-sol-explain-/.test(rendererSource) && /ensureExplainPanel/.test(rendererSource));
  check('renderer does not replace the target panel via setHTML(panelId)', !/setHTML\(panelId/.test(rendererSource));
  await testRendererDoesNotOverwriteSource(extraction);

  console.log(`\n=== ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed ===\n`);
  if (fail) process.exit(1);
})().catch(err => {
  console.error(err && err.stack || err);
  process.exit(1);
});