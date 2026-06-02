# SourceDeck v1 — UI Redesign Roadmap

> Status: **PLAN ONLY**. No implementation in this PR. No code, scripts, services, tests, workflows, signing, publishing, package metadata, or claims posture are changed by this document. Execution of any phase below requires explicit operator authorization (see Gating + authorization model).

> Companion documents (read alongside this roadmap):
> - `docs/design/ui-current-state-audit.md` — static-source audit of the existing renderer (tokens, type stack, layout, three `<style>` blocks in `sourcedeck.html`).
> - `docs/design/civic-atelier-direction.md` — the "SoHo × DC" / Civic Atelier visual direction (Hybrid Option C: warm ivory ground, brass gold, oxblood crimson, Cormorant Garamond italic editorial moments, IBM Plex Mono civic ledger).

> Screenshot honesty: this plan was written without live Electron screenshots. Playwright is not installed; there is no wired headless screenshot path for the Electron renderer; the orchestrator did not launch the app. All references to current state are grounded in static source (`sourcedeck.html` line ranges, CSS variables, type stack). Until a screenshot path is wired, every phase below specifies **operator-captured screenshots, attached to the PR** as the visual-evidence gate.

---

## 1. Purpose

This is a non-implementing roadmap for a phased visual overhaul of the SourceDeck v1 Electron renderer (`sourcedeck.html`, 10,779 lines, three inline `<style>` blocks at lines 8–529, 636–668, 2051–2082). It defines the order in which visual work should land, the files most likely touched in each phase, the validation gates that must remain green, the screenshot requirements, the rollback risk, and the no-go conditions that must hold for the work to proceed. It deliberately establishes that no Phase 20B–20G work begins without explicit operator authorization, and that every phase ships as its own additive, revertible PR. It grounds priorities in the findings of `docs/design/ui-current-state-audit.md` and the direction set in `docs/design/civic-atelier-direction.md`. It does not change runtime behavior, package metadata, services, workflows, signing posture, publishing posture, or compliance posture.

---

## 2. Top 12 visual improvements (priority ranked)

### 1. Design-token extraction

- **Current problem:** All design tokens live as CSS custom properties inside an inline `<style>` block in `sourcedeck.html` (lines 11–21), alongside three separate `<style>` blocks (8–529, 636–668, 2051–2082) that all reach for the same variables. There is no single token source; any palette change today is a multi-block search-and-replace in a 10,779-line file.
- **Why it hurts trust / demo value:** Every later improvement (nav contrast, parchment ground, brass gold) compounds regression risk because there is no canonical token layer to pivot. Reviewers cannot diff "the palette" — they can only diff the whole renderer.
- **Proposed fix:** Extract the existing CSS variable block into `docs/design/tokens.css` (or an equivalent inline token layer kept structurally isolated at the top of the file) without changing any visual value yet. Subsequent phases re-point token *values* to the Civic Atelier palette (warm ivory `#F6F1E8`, brass gold `#B08A3C`, oxblood `#6E1F2C`, ink navy, parchment, stone hairline) defined in `docs/design/civic-atelier-direction.md`.
- **Affected files / components:**
  - `sourcedeck.html` `<style>` block lines 11–21 (variables)
  - `sourcedeck.html` `<style>` blocks lines 8–529, 636–668, 2051–2082 (consumers)
  - future `docs/design/tokens.css` (or equivalent token layer)
- **Implementation risk:** Medium — touches the entire visual system at once; any token rename without back-compat aliases regresses every consumer.
- **Priority:** P0

### 2. Navigation redesign

- **Current problem:** Nav labels use 8px IBM Plex Mono uppercase set in `--dim:#2E4358` on the near-black `--bg:#07090F` ground (per `sourcedeck.html` lines 11–28). The contrast reads clinical and afterthought, not authoritative; the brand mark is `'Syne'` 700–800 with no civic separator language.
- **Why it hurts trust / demo value:** The first ten seconds of any demo are dominated by the sidebar. Low-contrast micro-labels on near-black read as "developer dashboard," which undermines the civic-operations-desk thesis the rest of the UI is reaching for.
- **Proposed fix:** Raise nav-label contrast off `--dim`, refresh the brand mark, and introduce civic ledger separators (thin brass hairlines, IBM Plex Mono section captions) per `docs/design/civic-atelier-direction.md`. Keep the 224 / 216 / 196 / 176 sidebar widths and the ≤900px horizontal switch intact.
- **Affected files / components:**
  - `sourcedeck.html` `<style>` block lines 8–529 — selectors for `.sidebar`, `.nav-label`, `.brand`, brand-mark markup
  - `sourcedeck.html` topbar markup and selectors (64px topbar)
- **Implementation risk:** Medium — global shell change; risk concentrated in the sidebar collapse at ≤900px.
- **Priority:** P0

### 3. Dashboard hierarchy

- **Current problem:** The current dashboard relies on KPI cards on a deep navy ground with gradient status strips and faint gold glows on hover. There is no editorial "today" column and no briefing-room KPI strip — the user lands on a generic CRM-style grid.
- **Why it hurts trust / demo value:** A GovCon operations buyer expects a briefing room: what changed today, what needs a decision today, what is the readout. The current grid does not narrate.
- **Proposed fix:** Introduce a briefing-room KPI strip across the top (calm typography, no gradient strips) and a parchment "today" column anchored on `--parchment:#F2EDE3` / `--ivory:#F7F4EE` (already in the token set but used only in document-surface zones), referencing the Civic Atelier ledger-table direction.
- **Affected files / components:**
  - `sourcedeck.html` dashboard view markup and its scoped selectors in the lines 8–529 `<style>` block
  - KPI card / status-strip selectors (currently gradient-driven)
- **Implementation risk:** Medium — dashboard is the demo opener; regression here is high-visibility.
- **Priority:** P0

### 4. Typography upgrade

- **Current problem:** Cormorant Garamond italic is already in use, but only inside `.brief-head`, `.opp-title`, `.section-lede`, `.pane-lede` (per the audit). Body remains `'Instrument Sans'` 13px on near-black, which reads small, cool, and screen-y.
- **Why it hurts trust / demo value:** The serif italic is the single most distinctive moment in the UI today and it never reaches the shell. The body size is below comfortable editorial reading on a warm ivory ground.
- **Proposed fix:** Move Cormorant Garamond italic into more shell-level moments (page titles, hero leads, section openers) and lift body to 14–15px on an ivory ground per `docs/design/civic-atelier-direction.md`. Keep IBM Plex Mono / Azeret Mono for civic ledger labels.
- **Affected files / components:**
  - `sourcedeck.html` `<style>` block lines 24–28 (type stack declarations)
  - all page-title and hero-lede selectors across the three `<style>` blocks
- **Implementation risk:** Medium — line-height and tracking changes ripple to every screen; risk of cropping in fixed-height components.
- **Priority:** P0

### 5. Card / panel system

- **Current problem:** Panels are `--panel:#0C1626` / `--panel2:#0A1420` / `--panel3:#111F36` / `--panel4:#162844` deep navy with `--border:#1C3050` hairlines and faint gold hover glows. This reads as a dashboard product, not as briefing documents.
- **Why it hurts trust / demo value:** Civic operations work is document work. Deep-navy cards do not invite reading; parchment surfaces with stone hairlines do.
- **Proposed fix:** Introduce a parchment surface primitive (ivory ground, stone hairline border, restrained shadow — no glow), referencing the Civic Atelier surface tokens. Retain deep-navy only for ambient shell chrome, not for primary content.
- **Affected files / components:**
  - `sourcedeck.html` `<style>` block lines 8–529 — `.panel`, `.card`, `.opp-card`, `.brief-*` selectors
  - shadow / border variables (radii `--r:12px`, `--r2:8px`)
- **Implementation risk:** Medium — touches every screen.
- **Priority:** P0

### 6. Status badge system

- **Current problem:** Status is communicated through gradient strip indicators on KPI cards (green / amber / red), which read as CRM-app chrome rather than briefing language.
- **Why it hurts trust / demo value:** Gradient strips are the single biggest "this is a SaaS dashboard, not a civic desk" tell on the screen.
- **Proposed fix:** Replace gradient strips with typography-led civic chips (Cormorant italic label + IBM Plex Mono caption + thin brass hairline, oxblood for warning, ink-navy for neutral), per `docs/design/civic-atelier-direction.md`.
- **Affected files / components:**
  - `sourcedeck.html` `<style>` block lines 8–529 — KPI badge and status-strip selectors
  - any inline status modifiers on dashboard / GovCon views
- **Implementation risk:** Low — additive component swap with clear visual contract.
- **Priority:** P1

### 7. GovCon workflow visual language

- **Current problem:** GovCon workspace views currently inherit the same deep-navy panel system as the dashboard, with no domain-specific visual vocabulary. Opportunities, capture, and pursuit tables read identically to KPI grids.
- **Why it hurts trust / demo value:** GovCon is the differentiator. Without a briefing-room section motif and ledger-table treatment, the workspace doesn't earn its name.
- **Proposed fix:** Introduce briefing-room section motifs (parchment ground, Cormorant italic section openers, IBM Plex Mono column captions) and ledger tables (stone hairline rows, ink-navy seals, brass gold accents) per the Civic Atelier direction.
- **Affected files / components:**
  - `sourcedeck.html` GovCon view markup and its selectors across the three `<style>` blocks
  - table / row / cell selectors in the opportunities and capture views
- **Implementation risk:** Medium — high screen surface area; multiple flows.
- **Priority:** P1

### 8. Onboarding / setup-wizard polish

- **Current problem:** The setup wizard inherits the dashboard shell — same deep-navy ground, same micro-uppercase labels. There is no editorial cover frame or civic step ledger.
- **Why it hurts trust / demo value:** First-run impression matters disproportionately. A wizard that looks like a settings page does not communicate that this is a civic-operations install.
- **Proposed fix:** Introduce an editorial cover frame (Cormorant italic title, parchment ground, restrained brass rule), a civic step ledger (IBM Plex Mono step captions, hairline progress, no animated bars), and restrained progress indicators.
- **Affected files / components:**
  - `sourcedeck.html` setup-wizard view markup and scoped selectors
  - operating-profile view selectors
- **Implementation risk:** Low — bounded surface, no shared-component risk.
- **Priority:** P1

### 9. AI / provider readiness visual treatment

- **Current problem:** Provider readiness uses `--purple:#A78BFA` as the AI accent, which reads as "mystical AI" against the civic palette. The existing `watsonx-readiness` status surfaces are functionally correct but visually misaligned.
- **Why it hurts trust / demo value:** Purple-on-navy "AI mysticism" undercuts a civic-operations posture. Readiness should read like a status ledger, not a magic console.
- **Proposed fix:** Restyle to a calm status ledger (IBM Plex Mono labels, ink-navy seals, brass gold for "ready," oxblood for "blocked"), keep the existing `watsonx-readiness` status surfaces and copy intact, retire purple mysticism. Do not change any claim about watsonx live state.
- **Affected files / components:**
  - `sourcedeck.html` AI / provider readiness view selectors
  - `watsonx-readiness` status surface selectors (visual only; no claim change)
- **Implementation risk:** Low — purely visual swap with no behavior change.
- **Priority:** P1

### 10. Troubleshooting / diagnostic visual treatment

- **Current problem:** Diagnostic output is currently rendered in the same panel system as everything else. Finding titles, evidence bodies, and remediation notes share visual weight.
- **Why it hurts trust / demo value:** Operators reading a troubleshooting screen need to distinguish *finding* from *evidence* at a glance. Today the hierarchy is flat.
- **Proposed fix:** Adopt ledger rows (stone hairlines, parchment ground), Cormorant italic finding titles, monospace evidence body (IBM Plex Mono), and a restrained oxblood rule for severity.
- **Affected files / components:**
  - `sourcedeck.html` troubleshooting view markup and selectors
  - any finding / evidence / remediation component classes
- **Implementation risk:** Low — bounded, additive.
- **Priority:** P1

### 11. Release evidence / support area

- **Current problem:** Release evidence and support surfaces inherit dashboard chrome. There is no "receipt" aesthetic to communicate audit-grade artifacts.
- **Why it hurts trust / demo value:** Release evidence is a trust artifact; it should look like a parchment receipt with a seal, not like a settings panel.
- **Proposed fix:** Parchment receipt aesthetic (ivory ground, brass hairline rules, ink-navy seals, IBM Plex Mono ledger lines), with Cormorant italic for receipt headings.
- **Affected files / components:**
  - `sourcedeck.html` release-evidence and support view selectors
- **Implementation risk:** Low — narrow surface, no shared regression risk.
- **Priority:** P2

### 12. Mobile / responsive polish

- **Current problem:** Existing breakpoints at 1180, 1024, and 900 px collapse to a generic stacked-card layout. The ≤900 px sidebar→horizontal switch works mechanically but does not preserve editorial voice.
- **Why it hurts trust / demo value:** Even though the demo runs on desktop, screenshots and any future browser preview will be judged at all widths. A generic stacked layout loses the civic ledger feeling.
- **Proposed fix:** Re-tune the existing 1180 / 1024 / 900 breakpoints to collapse into a civic ledger (stacked ledger rows, preserved hairlines, preserved Cormorant italic openers), not generic stacked cards. Verify the existing 900-px sidebar→horizontal switch still reads editorial.
- **Affected files / components:**
  - `sourcedeck.html` `<style>` block media queries at 1180 / 1024 / 900 px
  - sidebar and topbar responsive selectors
- **Implementation risk:** Low — additive media-query refinement on a stable layout system.
- **Priority:** P2

---

## 3. Phased implementation plan

### Phase 20B — Design Tokens + UI Foundation

- **Goal:** Extract CSS variables into a single token layer with no visual change beyond direct token substitution. Establish the canonical palette source for all later phases. No new tokens, no value changes — only structural extraction with back-compat aliases where any variable name shifts.
- **Files likely touched:**
  - `sourcedeck.html` `<style>` block lines 11–21 (variable declarations)
  - `sourcedeck.html` `<style>` blocks lines 8–529, 636–668, 2051–2082 (consumers, only if a variable rename requires aliasing)
  - new `docs/design/tokens.css` (or equivalent inline token layer at top of file)
- **Validation commands:**
  - `npm test`
  - `npm run release:evidence`
  - `npm run troubleshooting:scan`
  - `npm run govcon:smoke`
  - `npm run phase13:rc-check`
  - `npm run i18n:audit`
  - `node scripts/release-check.js`
- **Screenshot requirements:** Operator-captured screenshots, attached to the PR. Before/after of dashboard, sidebar, setup wizard, GovCon opportunities, troubleshooting, and release evidence views — visuals must be pixel-equivalent (token extraction is a refactor, not a visual change).
- **Rollback risk:** Medium — this phase is structurally load-bearing for 20C–20G. A revert is clean (single PR), but later phases depend on it; reverting 20B forces reverting all subsequent phases.
- **No-go conditions:** Any validation command fails; any operator-captured before/after screenshot shows a visible delta; any token rename lands without a back-compat alias; any change touches runtime behavior, services, scripts, workflows, signing, publishing, or claims posture.

### Phase 20C — Navigation + App Shell Redesign

- **Goal:** Redesign sidebar, topbar, brand mark, and page-title typography to the Civic Atelier direction. Raise nav-label contrast off `--dim`, introduce civic ledger separators, refresh the brand mark, move Cormorant Garamond italic into shell-level page titles.
- **Files likely touched:**
  - `sourcedeck.html` `<style>` block lines 8–529 — `.sidebar`, `.nav-label`, `.brand`, `.topbar`, page-title selectors
  - `sourcedeck.html` brand-mark markup and topbar markup
  - `docs/design/tokens.css` (consume tokens established in 20B)
- **Validation commands:**
  - `npm test`
  - `npm run release:evidence`
  - `npm run troubleshooting:scan`
  - `npm run govcon:smoke`
  - `npm run phase13:rc-check`
  - `npm run i18n:audit`
  - `node scripts/release-check.js`
- **Screenshot requirements:** Operator-captured screenshots, attached to the PR. Sidebar at all four widths (224 / 216 / 196 / 176 px) plus the ≤900 px horizontal mode. Topbar and brand mark at default width. Page title across at least three views (dashboard, GovCon, troubleshooting).
- **Rollback risk:** Medium — shell change visible on every screen. Revert is clean.
- **No-go conditions:** Any validation command fails; sidebar at ≤900 px regresses; any nav label drops below the contrast threshold set in `docs/design/civic-atelier-direction.md`; any runtime, service, script, workflow, signing, publishing, or claims-posture change.

### Phase 20D — Dashboard + GovCon Workspace Redesign

- **Goal:** Land the briefing-room dashboard (KPI strip, parchment "today" column), the ledger tables for GovCon workspace, the parchment card / panel surface system, and the typography-led civic status chips.
- **Files likely touched:**
  - `sourcedeck.html` dashboard view markup and selectors
  - `sourcedeck.html` GovCon opportunities and capture view markup and selectors
  - `sourcedeck.html` `<style>` block lines 8–529 — `.panel`, `.card`, `.opp-card`, KPI / status-strip selectors
- **Validation commands:**
  - `npm test`
  - `npm run release:evidence`
  - `npm run troubleshooting:scan`
  - `npm run govcon:smoke`
  - `npm run phase13:rc-check`
  - `npm run i18n:audit`
  - `node scripts/release-check.js`
- **Screenshot requirements:** Operator-captured screenshots, attached to the PR. Dashboard (default state, empty state, populated state). GovCon opportunities table (empty, populated, with status chips). Card surface system on at least three distinct views.
- **Rollback risk:** Medium — high-visibility demo surfaces. Revert is clean.
- **No-go conditions:** `npm run govcon:smoke` fails; any KPI value displayed today is hidden or relabeled (visual-only phase); any runtime behavior, service, script, workflow, signing, publishing, or claims-posture change.

### Phase 20E — Onboarding / Profile / AI Readiness Polish

- **Goal:** Restyle the setup wizard, operating-profile view, AI provider readiness view, and `watsonx-readiness` status surfaces to the Civic Atelier direction. Retire purple AI accent. Keep all status copy and claim text intact.
- **Files likely touched:**
  - `sourcedeck.html` setup-wizard markup and selectors
  - `sourcedeck.html` operating-profile view selectors
  - `sourcedeck.html` AI provider readiness view selectors
  - `sourcedeck.html` `watsonx-readiness` status surface selectors (visual only)
- **Validation commands:**
  - `npm test`
  - `npm run release:evidence`
  - `npm run troubleshooting:scan`
  - `npm run govcon:smoke`
  - `npm run phase13:rc-check`
  - `npm run i18n:audit`
  - `node scripts/release-check.js`
- **Screenshot requirements:** Operator-captured screenshots, attached to the PR. Setup wizard (each step). Operating profile (empty, populated). AI provider readiness (all status states). `watsonx-readiness` panel (all status states).
- **Rollback risk:** Low — bounded surfaces. Revert is clean.
- **No-go conditions:** Any change to readiness *copy* or claim posture; any change to the watsonx live-state claim; `npm run i18n:audit` fails; any runtime, service, script, workflow, signing, or publishing change.

### Phase 20F — Troubleshooting + Release Evidence Visual System

- **Goal:** Land the diagnostic ledger (parchment ground, Cormorant italic finding titles, monospace evidence body, oxblood severity rule) and the release-evidence "receipt" aesthetic (parchment ground, brass hairline rules, ink-navy seals).
- **Files likely touched:**
  - `sourcedeck.html` troubleshooting view markup and selectors
  - `sourcedeck.html` release-evidence view markup and selectors
  - `sourcedeck.html` support-area selectors
- **Validation commands:**
  - `npm test`
  - `npm run release:evidence`
  - `npm run troubleshooting:scan`
  - `npm run govcon:smoke`
  - `npm run phase13:rc-check`
  - `npm run i18n:audit`
  - `node scripts/release-check.js`
- **Screenshot requirements:** Operator-captured screenshots, attached to the PR. Troubleshooting view (empty, one finding, multi-finding, mixed severity). Release-evidence view (empty, populated). Support area (default state).
- **Rollback risk:** Low — bounded surfaces. Revert is clean.
- **No-go conditions:** `npm run troubleshooting:scan` or `npm run release:evidence` fails; any finding or evidence text is reordered or relabeled (visual-only phase); any change to release artifact contents, signing, or publishing posture.

### Phase 20G — Responsive QA + Demo Polish

- **Goal:** Re-verify all breakpoints (1180 / 1024 / 900 px and the ≤900 px sidebar→horizontal switch), tune the responsive collapse to a civic ledger rather than generic stacked cards, capture the demo-flow screenshot set, and finalize the first-10-seconds-of-demo opening frame.
- **Files likely touched:**
  - `sourcedeck.html` `<style>` block media queries at 1180 / 1024 / 900 px
  - `sourcedeck.html` sidebar / topbar responsive selectors
  - `docs/design/` demo-flow screenshot index (a new doc index, not a behavior change)
- **Validation commands:**
  - `npm test`
  - `npm run release:evidence`
  - `npm run troubleshooting:scan`
  - `npm run govcon:smoke`
  - `npm run phase13:rc-check`
  - `npm run i18n:audit`
  - `node scripts/release-check.js`
- **Screenshot requirements:** Operator-captured screenshots, attached to the PR. Full demo flow at three widths (≥1180, 1024, 900). The first-10-seconds-of-demo opening frame at the canonical demo width. Sidebar at all four widths plus the horizontal mode.
- **Rollback risk:** Low — additive media-query refinement.
- **No-go conditions:** Any breakpoint regression below the editorial baseline set in `docs/design/civic-atelier-direction.md`; any change to runtime behavior, services, scripts, workflows, signing, publishing, or claims posture.

---

## 4. Gating + authorization model

No Phase 20B–20G work begins without explicit operator authorization. Each phase ships as its own PR, scoped to the surfaces named in its "Files likely touched" list, and must pass the full baseline validation command set (`npm test`, `npm run release:evidence`, `npm run troubleshooting:scan`, `npm run govcon:smoke`, `npm run phase13:rc-check`, `npm run i18n:audit`, `node scripts/release-check.js`) plus an operator-captured screenshot set attached to the PR. No phase may change runtime behavior, `package.json`, `scripts/`, `services/`, `test/`, `.github/` workflows, signing, publishing, or claims posture — these are visual-only PRs. If any phase requires touching one of those files to land its visuals, the phase is blocked and the work is re-scoped before re-authorization. The operator may pause between any two phases; the natural pause points are after 20C (shell landed) and after 20E (onboarding / readiness landed).

---

## 5. Rollback strategy

Each phase PR is additive and revertible. Phase 20B (token extraction) is the only structurally load-bearing change; later phases consume the token layer it establishes. If any of 20C–20G needs to be rolled back, it can be reverted independently without rolling back 20B, because 20B is a refactor that preserves all pre-existing token values. If 20B itself needs to be rolled back, all subsequent phases must also be reverted in reverse order (20G → 20F → 20E → 20D → 20C → 20B), because they bind to the token layer. Reverts use standard `git revert` of the phase PR; no destructive history rewrite is ever required. The pre-existing stashed WIP (a prior SoHo × DC exploration exists; not applied) is not part of this rollback chain and is not referenced operationally.

---

## 6. Non-goals

- No feature work.
- No new product surfaces.
- No pricing changes.
- No compliance claims (no FedRAMP, SOC 2, CMMC, HIPAA, HITRUST, ISO 27001, "government compliant").
- No watsonx live claim.
- No signed / notarized claim.
- No marketing copy changes.
- No animation library additions.
- No changes to `package.json`, `scripts/`, `services/`, `test/`, `.github/`, signing, or publishing.
- No claim that any contract, award, or revenue outcome is guaranteed.
- No claim of "unlimited AI."

---

## 7. Open questions for the operator

These need an operator decision **before** Phase 20B starts:

- Confirm **Hybrid Option C** (warm ivory ground + brass gold + oxblood + Cormorant Garamond italic editorial moments + IBM Plex Mono civic ledger) as the direction, per `docs/design/civic-atelier-direction.md`?
- Confirm **Warm Ivory `#F6F1E8`** as the primary ground (replacing `--bg:#07090F` near-black as the default surface, with deep navy retained only as ambient shell chrome)?
- Confirm **Brass Gold `#B08A3C`** replaces the existing cool `--gold:#C9941A` everywhere, including `--gold2:#E8A91E`?
- Confirm **Cormorant Garamond italic** moves into shell-level moments (page titles, hero leads), not only the existing `.brief-head` / `.opp-title` / `.section-lede` / `.pane-lede` zones?
- Confirm replacement of inline emoji icons (e.g., the "📡" near `sourcedeck.html` line 777) with a monoline icon set, and which set?
- Should the existing `--crimson:#8B1A2E` remain as the warning chip color, or be retired in favor of Oxblood `#6E1F2C`? (The audit direction recommends `#6E1F2C`.)
- Approval cadence: one-PR-per-phase straight through, or natural pause points after 20C (shell landed) and 20E (onboarding / readiness landed) for operator review before continuing?
- Screenshot baseline: until a Playwright or computer-use screenshot path is wired, confirm the operator will capture and attach the screenshot set for each phase PR?
