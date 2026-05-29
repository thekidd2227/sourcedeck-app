# GovCon Outreach OS — Integrated Release Smoke

One complete operator flow across the merged GovCon surfaces (Capture
Suite, SAM Opportunity Outreach, Prime Partner Finder, Setup Wizard,
readiness banners, proposal workspace, Official Q&A / email drafting,
exports, scheduled SAM search). Run against a local build before any
release. PR #18 noted the UI was not visually verified — this checklist
closes that gap and must be performed by an operator.

A static gate for much of this exists:

```
npm run govcon:smoke
npm run govcon:outreach-os:audit
```

The static gates verify wiring, credential boundary, and guardrail
references. The steps below still require a human for true UI behavior.

## End-to-end operator flow

1. **Launch app** — `npm start`; no console crash.
2. **Setup wizard** — appears automatically if GovCon/SAM setup is
   incomplete (once per session).
3. **SAM key (presence-only)** — add or skip a SAM.gov key via the
   wizard's safe credential flow.
4. **No raw key shown** — after save, the raw key is never displayed;
   status shows "SAM.gov key saved".
5. **GovCon tab** — opens and renders the pipeline.
6. **SAM search without key** — shows a fallback / human sam.gov route,
   not an error.
7. **GovCon Analyze** — returns a deterministic decision (rules before
   AI).
8. **KILL is protected** — AI cannot promote a KILL to a bid.
9. **RED_RESTRICTED** — blocks informal outreach drafts.
10. **Official Q&A** — "Official Q&A / Clarification Draft" appears for a
    restricted active solicitation.
11. **Outreach tab** — opens.
12. **SAM Opportunity Outreach (demo)** — runs in demo mode with
    synthetic data.
13. **Closing-window filters** — 7-day / 30-day options work.
14. **Past-deadline excluded** — opportunities past their deadline are
    filtered out.
15. **Draft staged only** — outreach output is staged, never sent.
16. **Approval flags** — output carries `requiresApproval: true` and
    `sendingEnabled: false`.
17. **Scrubbed claims** — overclaim / guarantee / certification language
    is removed from drafts.
18. **Prime Partners** — opens.
19. **Prime Partner Finder (demo)** — runs by NAICS with demo data.
20. **Live USAspending** — only if safe and mocked/fallback-supported;
    otherwise confirm graceful fallback (no crash, no live secret use).
21. **Scoring labels** — fit/score labels display correctly.
22. **Prime outreach draft** — generates a staged draft.
23. **No auto-send** — no email is sent automatically.
24. **Capability memo** — generates.
25. **Human-review footer** — appears on memo/drafts.
26. **Status lifecycle** — changing a prime row's status works.
27. **Exports strip secrets** — exports contain no API keys / tokens /
    Authorization values.
28. **Readiness copy** — banner uses approved vocabulary: "Setup
    incomplete", "Ready for review", "Demo data", "Manual review
    required".
29. **No forbidden copy** — nothing says "safe to send", "compliant",
    "certified", or "fully operational".
30. **Modal escapes HTML** — result modal output is HTML-escaped.

## Operating Profile Wizard (Phase 14A)

31. **Open wizard** — GovCon tab → ⚙ Setup opens the 9-step Operating
    Profile Wizard.
32. **Business profile** — enter legal name, website, contact, core
    services, differentiators; advance.
33. **Capability statement extraction** — paste capability statement
    text, click "Extract candidate fields", confirm candidate UEI / CAGE
    / NAICS / PSC / certs appear labeled **not verified**; check fields
    and "Approve selected → fill form"; confirm the form fields populate.
34. **GovCon targeting** — confirm UEI/CAGE/NAICS/PSC/agencies persist.
35. **SAM.gov key** — save → status shows "saved"; confirm raw key never
    redisplayed; remove → status shows "missing".
36. **AI provider key** — select OpenAI/Anthropic/watsonx, save → status
    "AI provider key saved"; remove → "No AI key saved". Raw key never
    shown.
37. **Creative / Canva key** — save → status "Creative key saved (for
    future workflows)"; confirm copy does not claim live Canva generation;
    remove works.
38. **Social handles** — enter LinkedIn/Facebook/Instagram/TikTok handles
    + default platforms; confirm saved as profile context only (no
    posting); edit and re-save; confirm persisted on reopen.
39. **Safety rules** — confirm approval toggles + blocked topics +
    approved claims persist; confirm disclaimer copy present.
40. **Finish** — summary shows business / capability / targeting / SAM /
    AI / creative / social state; routes to GovCon/Outreach/Prime.
41. **Premium Content Agent context** — generate content; confirm it uses
    the operating profile (company, services, certs, PP), is draft-only
    (`requiresApproval`, `sendingEnabled:false`, `autoPost:false`),
    scrubs unsupported certs, and shows a claim-review checklist + human-
    review footer. Confirm no platform publishing / auto-post claims.
42. **Credential boundary** — confirm no raw key appears in renderer,
    logs, exports, or profile JSON; profile save rejects credential-
    looking strings.

## Sign-off

- Operator: ____________________  Date: __________
- Build/commit: ____________________
- Result: PASS / FAIL (attach notes for any failed step)
