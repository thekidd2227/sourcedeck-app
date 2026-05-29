# GovCon Operating Profile Wizard (Phase 14A)

## What changed

The narrow 5-step GovCon setup wizard is now a 9-step **Operating
Profile Wizard** that collects the full business / GovCon / credential /
creative / social context SourceDeck needs during premium operation —
safely, with a presence-only credential boundary and no auto-posting.

New backend:
- `services/settings/govcon-operating-profile.js` — full operating
  profile schema + sanitizer; rejects credential-looking strings;
  derives credential presence from `credentials.status()`; routes
  targeting through the existing targeting service (no duplication).
- `services/settings/credentials.js` — `KNOWN_SERVICES` extended with
  `canva, meta, instagram, facebook, tiktok, linkedin, google,
  x-twitter` (existing services retained).
- `services/govcon/capability-statement-extractor.js` — deterministic,
  offline, candidate-only extraction.
- `services/govcon/premium-content-agent.js` — draft-only content from
  the operating profile.
- preload/main/api: `window.sd.govcon.profile.{get,save,reset,
  extractCapabilityStatement}` and `window.sd.govcon.content.generate`.

## Wizard steps

1. **Business profile** — legal name, DBA, website, email, phone, HQ
   state, service area, primary contact, description, core services,
   differentiators.
2. **Capability statement** — paste text → extract candidate fields →
   review/approve → fill form. (File/PDF upload is planned/TODO; no OCR.)
3. **GovCon targeting** — certifications, UEI, CAGE, NAICS, PSC, target
   & excluded agencies, excluded types, target states, contract size,
   minimum margin, prime/sub preference, remote/on-site preference.
4. **SAM.gov API key** — save / remove / status (presence-only).
5. **AI agent API key** — provider select (OpenAI / Anthropic / watsonx)
   + save / remove / status.
6. **Creative / imaging API key** — provider select (Canva / other) +
   save / remove / status. "Credential saved for future creative-provider
   workflows." / "Manual image prompt workflow available now."
7. **Social handles & platforms** — LinkedIn / Facebook / Instagram /
   TikTok / YouTube / X handles + default content platforms. Context
   only; no posting.
8. **Safety & approval rules** — approval-before-outreach / before-posting
   toggles, block-unsupported-cert-claims, block-confidential-content,
   tone, blocked topics, approved claims.
9. **Finish** — setup summary + routing to GovCon / Outreach / Prime
   Partners.

## Where data is stored

- **Operating profile (business / identifiers / capability / content /
  safety):** main-process electron-store key `govcon.operatingProfile`.
- **Targeting (naics / psc / agencies):** routed to the canonical
  `govcon.targeting` store via the existing targeting service — one
  source of truth, no duplication.
- **Legacy `ARCG_OS.brand`** name/certifications are kept in sync for
  existing renderer consumers.

## Where credentials are stored

In the main process via `safeStorage` (`services/settings/credentials.js`).
The renderer only ever calls `sd.credentials.set/status/remove`
(presence-only). The operating profile **never** stores API keys —
`save()` strips any credential-looking value and reports it in
`_rejected`, never logging the value.

## Capability statement extraction behavior

Deterministic and offline. Produces **candidate** fields only
(`verified:false`, `requiresApproval:true`); nothing is auto-saved; the
user approves fields before they fill the form. No external upload, no
OCR.

## AI / creative / social onboarding

AI (OpenAI/Anthropic/watsonx) and creative (Canva/other) keys are saved
presence-only through the credential boundary. Social handles are profile
context only — SourceDeck does not connect to or post on any platform.

## Premium Content Agent relationship

`services/govcon/premium-content-agent.js` consumes the operating profile
(business, certifications, NAICS/PSC, agencies, services, differentiators,
past-performance snippets, social handles, default platforms, tone,
approved/blocked claims, image-style prefs) and produces draft-only
output: captions, hooks, quote cards, hashtags, image prompts, carousel
outlines, reel/TikTok hooks, manual posting notes, and a claim-review
checklist. Supported platforms: meta_business_suite, facebook, instagram,
tiktok, linkedin.

## Safety rules

- No auto-post, no auto-send, no live scraping, no platform publishing.
- No compliance/certification/partnership claims; unsupported cert
  language is scrubbed when the profile blocks it.
- RED_RESTRICTED and irreversible KILL unchanged; AI makes no final
  bid/no-bid, outreach, pricing, compliance, proposal, teaming, or
  publishing decisions.
- Every content/social output is draft-only and requires human approval.

## No-auto-post rule

The Premium Content Agent prepares drafts and manual posting notes only.
`requiresApproval:true`, `sendingEnabled:false`, `autoPost:false`,
`publishingSupported:false` on every output. No SMTP/transport path.

## Known limitations

- Capability-statement file/PDF upload + OCR are planned (TODO); paste
  text or enter manually for now.
- Canva / social keys are stored for **future** workflows; no live
  generation or publishing connector exists.
- Extraction is regex/heuristic and candidate-only — always review.

## Tests run / results

- `npm test` — all suites green, including new
  `capability-statement-extractor` (8/8),
  `govcon-operating-profile-wizard` (18/18),
  `govcon-premium-content-agent` (7/7); existing
  `govcon-setup-wizard` (12/12), credential-boundary (14/14),
  architecture-boundary (22/22).
- `npm run govcon:smoke` (47/0), `govcon:outreach-os:audit` (66/0),
  `phase13:rc-check`, `i18n:audit` (31/31), `release-check` (codesign
  WARN only).

## Rollback guidance

Additive. To roll back, revert the phase commit/PR. The targeting
service, credential store, and existing GovCon workflows are unaffected;
the new operating-profile store key is independent and reverting leaves
no orphaned behavior (the old wizard returns).
