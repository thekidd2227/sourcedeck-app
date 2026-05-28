'use strict';

const EVENT_TYPES = Object.freeze([
  'response_due',
  'qa_deadline',
  'site_visit',
  'rsvp_deadline',
  'amendment_deadline',
  'proposal_submission',
  'past_performance_due',
  'pricing_due',
  'delivery_milestone',
  'period_of_performance_start',
  'period_of_performance_end',
  'phase_milestone'
]);

const TYPE_PATTERNS = [
  ['qa_deadline', /\b(q&a|questions?|clarifications?)\b.{0,80}\b(due|deadline|submit|received by|no later than)\b/i],
  ['site_visit', /\b(site visit|walkthrough|pre[-\s]?proposal conference)\b/i],
  ['rsvp_deadline', /\b(rsvp|register|registration)\b.{0,80}\b(due|deadline|by|no later than)\b/i],
  ['amendment_deadline', /\b(amendment|amendments)\b.{0,80}\b(due|deadline|effective|issued)\b/i],
  ['past_performance_due', /\bpast performance\b.{0,80}\b(due|deadline|submit|volume)\b/i],
  ['pricing_due', /\b(price|pricing|cost volume|cost proposal)\b.{0,80}\b(due|deadline|submit)\b/i],
  ['proposal_submission', /\b(proposal|quote|quotation|offer)\b.{0,80}\b(due|deadline|submit|submission|received by|no later than)\b/i],
  ['response_due', /\b(response|responses|closing date)\b.{0,80}\b(due|deadline|received by|no later than)\b/i],
  ['delivery_milestone', /\b(delivery|deliverable|milestone|phase)\b.{0,80}\b(due|complete|completion|start|end)\b/i],
  ['period_of_performance_start', /\b(period of performance|pop|performance period)\b.{0,80}\b(start|begin|commence)\b/i],
  ['period_of_performance_end', /\b(period of performance|pop|performance period)\b.{0,80}\b(end|expire|through|until)\b/i]
];

const DATE_RE = /\b(?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})\b(?:\s+(?:at\s+)?\d{1,2}:\d{2}\s*(?:am|pm|a\.m\.|p\.m\.)?)?/ig;

function extractDeadlines(input, opts) {
  opts = opts || {};
  const now = opts.now instanceof Date ? opts.now : new Date(opts.now || Date.now());
  const solicitationNumber = clean(input && (input.solicitationNumber || input['Solicitation Number'] || input.noticeId || input['Notice ID']), 120);
  const text = extractText(input);
  if (!text) return { ok: false, reason: 'no_text', events: [], reminders: [] };
  const events = dedupeEvents(findDateEvents(text, solicitationNumber, now));
  const reminders = generateReminders(events, { now });
  return {
    ok: true,
    solicitationNumber,
    events,
    reminders,
    reviewRequired: events.some(e => e.status === 'needs_review' || e.confidence < 0.72),
    supportedInputs: ['PDF text extraction upstream', 'DOCX text extraction upstream', 'TXT', 'structured JSON']
  };
}

function approveEvents(input, opts) {
  opts = opts || {};
  const now = opts.now instanceof Date ? opts.now : new Date(opts.now || Date.now());
  const approved = (Array.isArray(input && input.events) ? input.events : [])
    .filter(e => e && e.approved !== false)
    .map(normalizeEvent);
  return { ok: true, events: approved, reminders: generateReminders(approved, { now }) };
}

function findDateEvents(text, solicitationNumber, now) {
  const lines = String(text)
    .split(/\r?\n|(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map(s => s.trim())
    .filter(Boolean);
  const events = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    DATE_RE.lastIndex = 0;
    while ((m = DATE_RE.exec(line)) !== null) {
      const iso = parseDate(m[0]);
      if (!iso) continue;
      const start = Math.max(0, m.index - 110);
      const end = Math.min(line.length, m.index + m[0].length + 110);
      const context = line.slice(start, end).replace(/\s+/g, ' ').trim();
      const type = classifyEventType(context);
      const ambiguous = isAmbiguous(context, type);
      events.push(normalizeEvent({
        eventId: eventId(solicitationNumber, iso, type),
        solicitationNumber,
        eventType: type,
        date: iso,
        sourceQuote: context.slice(0, 500),
        sourceSection: sectionFor(lines, i),
        confidence: ambiguous ? 0.55 : confidenceFor(context, type),
        status: ambiguous ? 'needs_review' : 'ready_for_review',
        isPast: Date.parse(iso) < startOfDay(now).getTime()
      }));
    }
  }
  return events;
}

function generateReminders(events, opts) {
  opts = opts || {};
  const nowMs = (opts.now instanceof Date ? opts.now : new Date(opts.now || Date.now())).getTime();
  const offsets = [48, 24, 12];
  const out = [];
  for (const e of Array.isArray(events) ? events : []) {
    const t = Date.parse(e.date);
    if (!isFinite(t) || t <= nowMs) continue;
    for (const hours of offsets) {
      const remindAt = t - hours * 3600000;
      if (remindAt <= nowMs) continue;
      out.push({
        reminderId: `${e.eventId || eventId(e.solicitationNumber, e.date, e.eventType)}_${hours}h`,
        eventId: e.eventId || eventId(e.solicitationNumber, e.date, e.eventType),
        solicitationNumber: e.solicitationNumber || '',
        eventType: e.eventType,
        offsetHours: hours,
        remindAt: new Date(remindAt).toISOString(),
        prompt: `${hours}h reminder: ${labelFor(e.eventType)} for ${e.solicitationNumber || 'solicitation'}`
      });
    }
  }
  return out;
}

function classifyEventType(context) {
  for (const [type, re] of TYPE_PATTERNS) if (re.test(context)) return type;
  return 'phase_milestone';
}

function normalizeEvent(e) {
  e = e || {};
  const eventType = EVENT_TYPES.includes(e.eventType) ? e.eventType : 'phase_milestone';
  const date = parseDate(e.date) || clean(e.date, 40);
  return {
    eventId: clean(e.eventId || eventId(e.solicitationNumber, date, eventType), 220),
    solicitationNumber: clean(e.solicitationNumber, 120),
    eventType,
    date,
    sourceQuote: clean(e.sourceQuote, 600),
    sourceSection: clean(e.sourceSection, 120),
    confidence: clamp(Number(e.confidence), 0, 1),
    status: e.status === 'needs_review' ? 'needs_review' : 'ready_for_review',
    needs_review: e.status === 'needs_review' || e.needs_review === true,
    isPast: !!e.isPast
  };
}

function dedupeEvents(events) {
  const seen = new Set();
  const out = [];
  for (const e of events.map(normalizeEvent)) {
    const key = `${e.solicitationNumber}|${e.date}|${e.eventType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

function extractText(input) {
  if (!input) return '';
  if (typeof input === 'string') return input;
  if (typeof input.text === 'string') return input.text;
  if (typeof input.content === 'string') return input.content;
  if (input.json && typeof input.json === 'object') return JSON.stringify(input.json, null, 2);
  if (typeof input === 'object') return JSON.stringify(input, null, 2);
  return '';
}

function parseDate(raw) {
  const d = new Date(String(raw || '').replace(/\b(a\.m\.|p\.m\.)/ig, x => x.replace(/\./g, '')));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function sectionFor(lines, idx) {
  for (let i = idx; i >= Math.max(0, idx - 8); i--) {
    const m = String(lines[i] || '').match(/\b(section\s+[A-Z]|\b[A-Z]\.\d+(?:\.\d+)?|amendment\s+\d+|clause\s+[\d.:-]+)\b/i);
    if (m) return m[0];
  }
  return '';
}

function isAmbiguous(context, type) {
  return type === 'phase_milestone' || /\b(estimated|anticipated|target|on or about|approx(?:\.|imately)?|tentative|tbd)\b/i.test(context);
}
function confidenceFor(context, type) {
  let c = type === 'phase_milestone' ? 0.62 : 0.78;
  if (/\b(no later than|deadline|due|received by)\b/i.test(context)) c += 0.12;
  if (/\b(section|L\.|M\.|amendment)\b/i.test(context)) c += 0.05;
  return clamp(c, 0, 0.95);
}
function eventId(sol, date, type) { return ['date', sol || 'unknown', type || 'phase_milestone', String(date || '').slice(0, 19)].join('_').replace(/[^a-zA-Z0-9_]+/g, '_'); }
function labelFor(type) { return String(type || '').replace(/_/g, ' '); }
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function clean(v, max) { return String(v || '').trim().slice(0, max || 200); }
function clamp(n, lo, hi) { n = Number(n); if (!isFinite(n)) n = lo; return Math.max(lo, Math.min(hi, n)); }

module.exports = {
  EVENT_TYPES,
  extractDeadlines,
  approveEvents,
  generateReminders,
  dedupeEvents,
  normalizeEvent,
  _internal: { classifyEventType, parseDate, extractText }
};
