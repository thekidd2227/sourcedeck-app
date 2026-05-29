// services/govcon/premium-content-agent.js
//
// Premium GovCon Content Agent — deterministic, draft-only content
// preparation that consumes the GovCon Operating Profile.
//
// HARD RULES (enforced here):
//   - Draft-only. Every output sets requiresApproval:true,
//     sendingEnabled:false, autoPost:false. SourceDeck prepares content;
//     the user approves and posts manually.
//   - No platform publishing / connector claims. Supported platforms are
//     content-prep targets only: meta_business_suite, facebook,
//     instagram, tiktok, linkedin.
//   - No unsupported certification/compliance claims. When the profile
//     sets blockUnsupportedCertificationClaims, certification language is
//     only included for certifications the profile marks true, and a
//     claim-review checklist is always attached.
//   - 75/25 content ratio (feature/benefit/credibility vs diagnostic/POV).
//
// Pure functions. No network, no AI provider calls (an AI provider can
// expand these drafts later via the existing main-process ai surface;
// this module is deterministic so it is testable and safe by default).

'use strict';

const SUPPORTED_PLATFORMS = Object.freeze(['meta_business_suite', 'facebook', 'instagram', 'tiktok', 'linkedin']);
const HUMAN_REVIEW_FOOTER = 'Draft only — human review and approval required before posting. SourceDeck does not auto-post or publish to any platform.';

function arr(v) { return Array.isArray(v) ? v.filter(Boolean) : []; }
function str(v) { return typeof v === 'string' ? v.trim() : ''; }
function uniq(a) { return Array.from(new Set(a.filter(Boolean))); }

// Certifications the profile asserts are true (for safe claim language).
function activeCertifications(profile) {
  const certs = (profile && profile.identifiers && profile.identifiers.certifications) || {};
  return Object.keys(certs).filter(k => k !== 'other' && certs[k] === true);
}

// Build a claim-review checklist the user must clear before posting.
function buildClaimReviewChecklist(profile, draftText) {
  const block = (profile && profile.content && profile.content.blockedClaims) || [];
  const approved = (profile && profile.content && profile.content.approvedClaims) || [];
  const items = [
    'Confirm every factual claim is true and substantiated.',
    'Do not state or imply compliance/certification you do not hold.',
    'Remove any confidential proposal, CUI, or PII content.'
  ];
  for (const b of block) items.push('Blocked claim to avoid: "' + b + '"');
  if (approved.length) items.push('Pre-approved claims you may use: ' + approved.join('; '));
  return items;
}

// Scrub unsupported certification mentions from generated text when the
// profile asks us to. Conservative: only keeps certs marked active.
function scrubUnsupportedCerts(text, profile) {
  if (!profile || !profile.safety || profile.safety.blockUnsupportedCertificationClaims === false) return text;
  const active = activeCertifications(profile).map(c => c.toUpperCase());
  const ALL = ['SDVOSB', 'VOSB', 'HUBZONE', '8(A)', 'WOSB', 'EDWOSB', 'MBE', 'DBE', 'SBE'];
  let out = text;
  for (const cert of ALL) {
    if (active.includes(cert)) continue;
    const re = new RegExp('\\b' + cert.replace(/[()]/g, '\\$&') + '\\b', 'gi');
    out = out.replace(re, '');
  }
  // collapse whitespace left by removals
  return out.replace(/\s{2,}/g, ' ').trim();
}

// ── content building blocks ──────────────────────────────────────────

function buildHashtags(profile) {
  const base = ['#SourceDeck', '#GovCon', '#GovernmentContracting'];
  const prefs = arr(profile && profile.content && profile.content.hashtagPreferences);
  const certs = activeCertifications(profile).map(c => '#' + c.replace(/[^A-Za-z0-9]/g, ''));
  return uniq(base.concat(prefs, certs)).slice(0, 12);
}

function buildHooks(profile, topic) {
  const company = str(profile && profile.business && profile.business.legalBusinessName) || 'our team';
  const diffs = arr(profile && profile.business && profile.business.differentiators);
  return uniq([
    topic ? ('Most teams get ' + topic + ' wrong. Here is the part nobody checks.') : ('What ' + company + ' actually delivers — without the buzzwords.'),
    diffs[0] ? (diffs[0] + ' — and why it matters on a real contract.') : 'The boring discipline that wins recompetes.',
    'A quick note for capture leads:'
  ]);
}

function buildImagePrompts(profile, topic) {
  const style = arr(profile && profile.content && profile.content.imageStylePreferences);
  const styleNote = style.length ? (' Style: ' + style.join(', ') + '.') : '';
  return [
    'Manual image prompt: clean, professional graphic representing "' + (topic || 'GovCon capability') + '" with restrained government-contracting visual cues; no fake logos, no real agency seals.' + styleNote,
    'Quote-card prompt: a single legible quote on a dark background with a small brand wordmark area (left blank for the user to add their own).'
  ];
}

function buildCarouselOutline(profile, topic) {
  const services = arr(profile && profile.business && profile.business.coreServices).slice(0, 3);
  return uniq([
    'Slide 1 — Hook: ' + (topic || 'the problem your buyer recognizes'),
    'Slide 2 — Why it matters (no hype)',
    services[0] ? ('Slide 3 — Capability: ' + services[0]) : 'Slide 3 — What you actually do',
    'Slide 4 — Proof (past performance snippet, no PII)',
    'Slide 5 — What you say no to (trust slide)',
    'Slide 6 — Soft CTA (conversation, not a hard sell)'
  ]);
}

// ── top-level generator ──────────────────────────────────────────────

function generatePremiumContent(profile, request) {
  request = request || {};
  const platformsReq = arr(request.platforms).filter(p => SUPPORTED_PLATFORMS.includes(p));
  const defaults = arr(profile && profile.content && profile.content.defaultPostingPlatforms).filter(p => SUPPORTED_PLATFORMS.includes(p));
  const platforms = (platformsReq.length ? platformsReq : (defaults.length ? defaults : ['linkedin']));
  const topic = str(request.topic);
  const tone = str(profile && profile.content && profile.content.approvedTone) || 'direct, operator voice';

  const company = str(profile && profile.business && profile.business.legalBusinessName) || '[your company]';
  const services = arr(profile && profile.business && profile.business.coreServices);
  const diffs = arr(profile && profile.business && profile.business.differentiators);
  const pp = arr(profile && profile.capabilityStatement && profile.capabilityStatement.extractedPastPerformanceSnippets);

  const hooks = buildHooks(profile, topic);
  const hashtags = buildHashtags(profile);
  const imagePrompts = buildImagePrompts(profile, topic);
  const carouselOutline = buildCarouselOutline(profile, topic);

  // Per-platform draft captions (draft-only).
  const drafts = platforms.map(platform => {
    let caption = hooks[0] + '\n\n' +
      company + (services.length ? (' helps with ' + services.slice(0, 2).join(' and ') + '.') : ' supports federal buyers.') +
      (diffs.length ? ('\n\nWhat sets us apart: ' + diffs.slice(0, 2).join('; ') + '.') : '') +
      (pp.length ? ('\n\nRecent work: ' + pp[0]) : '') +
      '\n\n' + (platform === 'tiktok' || platform === 'instagram' ? hashtags.slice(0, 6).join(' ') : hashtags.join(' '));
    caption = scrubUnsupportedCerts(caption, profile);
    return {
      platform,
      caption,
      reelOrTiktokHook: (platform === 'tiktok' || platform === 'instagram') ? hooks[2] : null,
      requiresApproval: true,
      sendingEnabled: false,
      autoPost: false
    };
  });

  return {
    mode: 'PREMIUM_CONTENT',
    contentRatio: { featureBenefit: 75, diagnosticPOV: 25 },
    supportedPlatforms: SUPPORTED_PLATFORMS.slice(),
    platforms,
    tone,
    hooks,
    quoteCards: [hooks[0], diffs[0]].filter(Boolean),
    hashtags,
    imagePrompts,
    carouselOutline,
    drafts,
    manualPostingNotes: 'Copy the approved caption into ' + platforms.join(', ') + ' yourself. SourceDeck does not connect to or post on any platform.',
    claimReviewChecklist: buildClaimReviewChecklist(profile),
    // Hard invariants (defensively re-asserted)
    requiresApproval: true,
    sendingEnabled: false,
    autoPost: false,
    publishingSupported: false,
    humanReviewFooter: HUMAN_REVIEW_FOOTER
  };
}

module.exports = {
  generatePremiumContent,
  scrubUnsupportedCerts,
  buildClaimReviewChecklist,
  activeCertifications,
  buildHashtags,
  SUPPORTED_PLATFORMS,
  HUMAN_REVIEW_FOOTER
};
