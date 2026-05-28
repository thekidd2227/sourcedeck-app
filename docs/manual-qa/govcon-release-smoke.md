# GovCon Release Smoke Checklist

Operator-run release smoke for the GovCon Capture Suite + First-Time
Setup Wizard. Run against a local build before any release that ships
GovCon. None of these steps should ever expose a raw API key in the
renderer, logs, exports, or UI state.

A static, non-Electron version of many of these checks is available via:

```
npm run govcon:smoke
```

The static script verifies wiring, credential boundary, and guardrail
references. The manual steps below still require a human for true UI
behavior.

## Manual checklist

1. **App launches** — `npm start` opens the app with no console crash.
2. **GovCon tab opens** — the GovCon tab renders the pipeline table.
3. **SAM search without key** — running search with no SAM key configured
   shows a fallback / human sam.gov route, not an error.
4. **SAM key status is presence-only** — after saving a SAM key, the UI
   shows "SAM.gov key saved" / presence; the raw key is never displayed.
5. **Favorite action works** — ☆ favorites an opportunity and persists it.
6. **Dates action works** — Dates returns a deadline review result.
7. **Subs action works** — Subs returns a subcontractor sourcing package.
8. **Incumbent action works** — Inc returns incumbent research (with
   confidence / MORE_RESEARCH_NEEDED when evidence is weak).
9. **Q&A opens as Official Q&A / Clarification Draft** — the Q&A action
   is labeled as official Q&A / clarification, not informal outreach.
10. **Proposal opens Proposal Workspace** — Prop returns a proposal
    workspace result.
11. **Analyze uses deterministic solicitation analysis** — Analyze runs
    deterministic rules first; AI may explain but cannot override.
12. **RED_RESTRICTED blocks informal outreach** — during an active
    restricted solicitation, no informal outreach draft is produced;
    only the official Q&A path is offered.
13. **KILL remains irreversible** — a killed opportunity cannot be
    promoted to bid without explicit new user-reviewed evidence.
14. **Exports contain no secrets** — generated exports contain no API
    keys, tokens, or Authorization/Bearer values.
15. **No fake vendor/incumbent data shown as verified** — inferred or
    candidate data is labeled; low-confidence is marked, not asserted.
16. **Result modal escapes HTML** — result output is HTML-escaped (no
    markup injection from opportunity text).
17. **Human review language appears** — outputs carry human-review /
    follow-solicitation-instructions language.

## First-time setup wizard

18. **Wizard appears when incomplete** — opening GovCon with no profile
    and no SAM key presence offers the first-time setup wizard.
19. **Profile step** — company name, certifications, target NAICS, and
    target agencies can be entered and saved.
20. **SAM step** — pasting a SAM key saves it via the safe credential
    boundary; the raw key is never shown after save; "missing" state is
    shown when absent.
21. **Demo/import step** — user can choose synthetic demo, paste a first
    opportunity, or continue with manual SAM fallback.
22. **Safety step** — copy states AI outputs require human review, that
    SourceDeck does not approve outreach / certify compliance / make
    final bid decisions, and that RED_RESTRICTED + KILL protect
    procurement integrity.
23. **Finish** — wizard routes back to the GovCon workspace, the setup
    banner updates, and no raw secrets are displayed.

## Readiness banner

24. **GovCon profile state** — banner reflects GovCon profile present /
    missing.
25. **SAM key state** — banner reflects SAM.gov key present / missing
    (presence-only).
26. **Demo data labeled** — demo/sample mode is clearly labeled.
27. **Language discipline** — banner never says "safe to send", "fully
    operational", "compliant", or "certified". It uses "Ready for
    review", "Setup incomplete", "Manual review required", "Demo data".
