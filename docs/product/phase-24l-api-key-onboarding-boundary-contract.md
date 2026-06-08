# Phase 24L-PREP — API Key Onboarding Boundary Contract

**Date:** 2026-06-08
**Posture:** Docs only. **No runtime / pricing / website change.** Governs where credentials may be requested and how they must be handled.
**Companions:** `docs/audits/phase-24l-setup-wizard-rc-acceptance-checklist.md`, `docs/product/phase-24l-pilot-onboarding-qa-contract.md`, `docs/audits/phase-24f-no-send-no-submit-compliance-checklist.md`.

---

## 1. Credential placement policy

API keys may be requested **only** in:
- **Setup Wizard**
- **Settings**

API keys may **not** be requested in:
- SAM search / SAM Sprint / Opportunity Outreach screen
- Capture Command Center
- Solicitation Workspace
- Submission Readiness Gate
- Internal Review Export
- Response Desk
- Demo screens
- Docs previews
- Logs

## 2. SAM.gov API key rule

| Surface | Key input | Status display |
|---|---|---|
| Setup Wizard (`#gcwiz-sam`, step 4) | **Allowed** | n/a |
| Settings (`#s-samkey`) | **Allowed** | n/a |
| SAM search / Sprint / Outreach (`#tab-outreach`) | **Forbidden** | **Status-only allowed** (`#out-samkey-status`) + "Configure in Settings" button |

Post-24I state already satisfies this: the Outreach screen shows a presence-only status chip and a navigation button to Settings; the only key inputs are the Setup Wizard and Settings.

## 3. Other API key rule

If other API keys are requested (Airtable PAT, Apollo, OpenAI, Claude, etc.):
- **Group them together** in the Setup Wizard's API keys step.
- **Manage them later in Settings.**
- Do **not** scatter credential prompts across workflow screens.
- Do **not** expose saved key values (presence-only status; raw value cleared from the DOM after save; secure credential-boundary storage, e.g. `window.sd.credentials.set(...)`).

## 4. Safe UI wording

**Approved:**
- "Add during setup or manage later in Settings."
- "Configured / Not configured."
- "Open Settings."
- "Run Setup Wizard."
- "Only add keys for services you plan to use."

**Forbidden:**
- "Paste your key here" on any workflow screen.
- "Enter SAM key to search" on the SAM search screen.
- An exposed key value anywhere.
- Logs showing a key.
- Docs / screenshots showing a real key.

## 5. Final RC grep terms (future verification)

Run read-only at RC hardening time. Hits must be only safe references (Setup Wizard / Settings inputs, presence-only status, credential-boundary save calls) — never a raw/exposed key value, and never a key input on a workflow screen.

```
# Key-input labels and fields — expect only Setup Wizard + Settings
grep -RInE "API key|apiKey|API Key" sourcedeck.html

# SAM credential identifiers — expect Settings input, wizard input, status chip, boundary save
grep -RInE "sam-gov|s-samkey|gcwiz-sam|out-samkey-status|SAM\.gov API key" sourcedeck.html

# Credential save calls — expect secure boundary, not plaintext persistence
grep -RInE "credentials\.set|saveSettings|gcWizSaveSam" sourcedeck.html

# No key input on the SAM search/outreach/sprint surface (manual review of context)
grep -nE "tab-outreach" sourcedeck.html

# .env references — expect none introduced; never read/print/commit secrets
grep -RInE "\.env\b|process\.env\.[A-Z_]*KEY|SAM_API_KEY|API_KEY\s*=" sourcedeck.html docs

# Unsafe send/submit/upload claims — expect only negative/forbidden-copy context
grep -RInE "Send Email|Submit Bid|Submit Quote|Export and submit|upload to (SAM|PIEE|eBuy|GSA)|package submitted" sourcedeck.html docs
```

**Hard rule:** no key may be printed, exposed, hardcoded, logged, committed, or shown in demos / export screens. Status is **presence-only** — configured vs. not configured — never the value.
