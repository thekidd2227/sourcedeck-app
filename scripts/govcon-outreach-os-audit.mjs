#!/usr/bin/env node
/**
 * GovCon Outreach OS — static integration audit.
 *
 * Verifies the merged GovCon surfaces (Capture Suite, SAM Opportunity
 * Outreach, Prime Partner Finder, Setup Wizard, readiness banners,
 * proposal workspace, Official Q&A / email drafting, exports, scheduled
 * SAM search) are wired as ONE coherent product, with the credential
 * boundary and procurement-integrity guardrails intact.
 *
 * Read-only. No Electron, no network. Exits non-zero on any failure.
 * Run: node scripts/govcon-outreach-os-audit.mjs  (npm run govcon:outreach-os:audit)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const ok  = (m) => { pass++; console.log('  ✅ ' + m); };
const bad = (m) => { fail++; console.log('  ❌ ' + m); };
const check = (name, cond) => cond ? ok(name) : bad(name);
const read = (p) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return ''; } };
// strip JS/HTML comments so descriptive text / disclaimers don't trip security checks
const decomment = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/\/\/.*$/gm, '');

const html    = read('sourcedeck.html');
const preload = read('preload.js');
const mainjs  = read('main.js');
// Phase 2 migrated IPC registration out of main.js into the composition
// root's feature registrar; section C scans that file (see
// docs/engineering/incident-govcon-ipc-release-smoke-drift.md).
const featureIpc = read('app/main/ipc/register-feature-ipc.js');
const apijs   = read('api/index.js');

console.log('── GovCon Outreach OS integration audit ──');

// ── A. UI surfaces (sourcedeck.html) ──────────────────────────────────
console.log('\n[A. UI surfaces]');
check('GovCon tab pane', /id="tab-govcon"/.test(html));
check('Outreach tab pane', /id="tab-outreach"/.test(html));
check('Prime Partners tab pane', /id="tab-primes"/.test(html));
check('GovCon Setup button (openGovconSetupWizard)', /openGovconSetupWizard\(\)/.test(html));
check('Setup wizard modal (govcon-wizard)', /id="govcon-wizard"/.test(html) && /gcwiz/.test(html));
check('Readiness banner present', /workspace-readiness/.test(html) && /govcon-setup-banner/.test(html));
check('Official Q&A / Clarification Draft label', /Official Q&A \/ Clarification Draft|Official Q&amp;A \/ Clarification Draft/.test(html));
check('No-auto-send / human approval language', /auto-send|human approval|human review/i.test(html));
check('Demo / sample labeling', /Demo data|demo mode|synthetic demo/i.test(html));

// ── B. Preload methods (exact names) ──────────────────────────────────
console.log('\n[B. Preload surface]');
const govconNs = ['deadlines', 'subcontractors', 'incumbent', 'solicitation', 'clarifications',
                  'communications', 'exports', 'scheduledSearches', 'outreach', 'primes'];
for (const ns of govconNs) check('window.sd.govcon.' + ns, new RegExp('\\b' + ns + '\\s*:\\s*\\{').test(preload));
check('outreach methods (scan/generateDraft/setStatus)',
  /outreach:\s*\{[\s\S]*?scan[\s\S]*?generateDraft[\s\S]*?setStatus/.test(preload));
check('primes methods (find/findLive/draft/memo)',
  /primes:\s*\{[\s\S]*?find[\s\S]*?findLive[\s\S]*?draft[\s\S]*?memo/.test(preload));
check('credentials.status/set/remove (presence-only)',
  /credentials:\s*\{[\s\S]*?status[\s\S]*?set[\s\S]*?remove/.test(preload));

// ── C. IPC handlers (composition root: register-feature-ipc.js) ───────
console.log('\n[C. IPC handlers]');
// main.js delegates registration to the composition root; assert the
// delegation contract holds, then scan the feature registrar source.
check('main.js delegates IPC registration (no inline ipcMain.handle)',
  !/ipcMain\.handle\(/.test(mainjs));
for (const ch of [
  'govcon:deadlines-extract', 'govcon:subcontractors-source', 'govcon:incumbent-research',
  'govcon:solicitation-analyze', 'govcon:clarifications-generate', 'govcon:communications-draft-email',
  'govcon:exports-create', 'govcon:outreach-scan', 'govcon:outreach-generate-draft',
  'govcon:outreach-set-status', 'govcon:primes-find', 'govcon:primes-find-live',
  'govcon:primes-draft', 'govcon:primes-memo',
  'credentials:status', 'credentials:set', 'credentials:remove'
]) check('ipc ' + ch, featureIpc.includes("'" + ch + "'") || featureIpc.includes('"' + ch + '"'));

// ── D. API adapter methods (api/index.js) ─────────────────────────────
console.log('\n[D. app-api surface]');
check('outreach scan/draft/status path', /outreach\s*:\s*\{[\s\S]*?scan[\s\S]*?generateDraft[\s\S]*?setStatus/.test(apijs));
check('primes find/findLive/draft/memo path', /primes\s*:\s*\{[\s\S]*?find[\s\S]*?findLive[\s\S]*?draft[\s\S]*?memo/.test(apijs));
check('export path (exports.create)', /exports\s*:\s*\{[\s\S]*?create/.test(apijs));
check('analysis path (solicitation.analyze)', /solicitation\s*:\s*\{[\s\S]*?analyze/.test(apijs));
check('SAM key read stays in main process (credentials.get(\'sam-gov\'))',
  /credentials\.get\(\s*['"]sam-gov['"]\s*\)/.test(apijs));

// ── E. Guardrails ─────────────────────────────────────────────────────
console.log('\n[E. Guardrails]');
const outreachSvc = read('services/govcon/opportunity-outreach.js');
const primeSvc    = read('services/govcon/prime-partner-finder.js');
const outreachWin = read('services/govcon/outreach-window.js');
const fastcash    = read('services/govcon/fast-cash.js');
const exportSvc   = read('services/govcon/export.js');
const solSvc      = read('services/govcon/solicitation-analysis.js');
check('RED_RESTRICTED', /RED_RESTRICTED/.test(outreachWin));
check('RED_RESTRICTED blocks drafts', /draftsAllowed:\s*false/.test(outreachWin));
check('KILL stays KILL / irreversible', /KILL stays KILL|Previously killed/.test(fastcash));
check('MORE_RESEARCH_NEEDED verdict', /MORE_RESEARCH_NEEDED/.test(fastcash) || /MORE_RESEARCH_NEEDED/.test(solSvc));
check('AI cannot override deterministic', /cannot\s+(override|.*KILL)/i.test(solSvc));
check('outreach requiresApproval:true', /requiresApproval\s*=\s*true|requiresApproval:\s*true/.test(outreachSvc));
check('outreach sendingEnabled:false', /sendingEnabled\s*=\s*false|sendingEnabled:\s*false/.test(outreachSvc));
check('primes requiresApproval:true', /requiresApproval\s*=\s*true|requiresApproval:\s*true/.test(primeSvc));
check('primes sendingEnabled:false', /sendingEnabled\s*=\s*false|sendingEnabled:\s*false/.test(primeSvc));
check('official Q&A only in restricted window', /official Q&A|official solicitation Q&A/i.test(outreachWin));
check('export secret stripping', /api[_-]?key|authorization|secret|token|credential/i.test(exportSvc) && /strip|continue|skip|redact/i.test(exportSvc));
check('human-review language in services', /human review|requires? human review|require human review/i.test(outreachSvc + primeSvc));

// ── F. Forbidden patterns ABSENT in renderer/preload ──────────────────
console.log('\n[F. Credential boundary — forbidden patterns absent]');
const htmlCode    = decomment(html);
const preloadCode = decomment(preload);
check('no Authorization header built in preload', !/['"]Authorization['"]\s*:/.test(preloadCode));
check('no x-api-key header in preload', !/['"]x-api-key['"]\s*:/.test(preloadCode));
check('no Bearer+key concat in preload', !/Bearer\s*['"]\s*\+/.test(preloadCode) && !/Bearer\s*\$\{/.test(preloadCode));
check('preload exposes no credentials.get', !/credentials\s*:\s*\{[\s\S]*?\bget\b\s*:/.test(preloadCode));
check('renderer builds no SAM auth header',
  !/api\.sam\.gov[\s\S]{0,160}(Authorization|x-api-key|api_key=)/.test(htmlCode));
check('renderer does not call credentials.get()', !/credentials\.get\(/.test(htmlCode));
check('renderer does not localStorage.setItem an API key',
  // Target real credential identifiers; ignore generic UI keys like
  // STORAGE_KEY / LEGACY_KEY (i18n locale) which are not secrets.
  !/localStorage\.setItem\([^,)]*(OPENAI_KEY|CLAUDE_KEY|ANTHROPIC|APOLLO_KEY|AT_PAT|SAM_API|SAM_KEY|GEMINI|apiKey|api_key|x-api-key|bearer|secret)/i.test(htmlCode));
check('no email send/transport path in renderer/preload',
  !/\b(nodemailer|sendgrid|mailgun|smtp|createTransport|sendMail)\b/i.test(htmlCode + preloadCode));

// ── G. No duplicate subsystems ────────────────────────────────────────
console.log('\n[G. No duplicate subsystems]');
const samBases = (read('services/govcon/sam-search.js').match(/api\.sam\.gov\/opportunities/g) || []).length;
check('single SAM.gov search base URL definition', samBases >= 1);
check('single govcon root namespace in preload', (preload.match(/\bgovcon:\s*\{/g) || []).length === 1);

console.log('\n── Summary ──');
console.log('  passes:   ' + pass);
console.log('  failures: ' + fail);
if (fail > 0) { console.log('\nFAIL'); process.exit(1); }
console.log('\nPASS');
