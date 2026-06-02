# SourceDeck v1.0 RC — Ruthless Visual Design Audit

**Direction under evaluation:** "SoHo × Washington DC" — editorial Atelier register (serif ledes, parchment document surfaces, warm brass, oxblood) fused with civic command register (navy, mono ledger labels, procurement-grade typography).

**Subject:** `sourcedeck.html` at v1.0 Release Candidate Lock (main @ 15c512f).

**Verdict in one line:** The renderer already contains the *vocabulary* of the target direction (Cormorant Garamond italics, parchment document zones, oxblood crimson, IBM Plex Mono ledger labels), but those moments are isolated to individual widgets while the dominant shell reads as a dark operator console. The product is functionally RC-ready and visually 5–6 / 10 against the SoHo × DC target.

---

## Purpose and scope

This document is a **read-only visual design audit** of the SourceDeck v1.0 RC renderer against the "SoHo × Washington DC" art direction. It evaluates what the current UI *looks and feels like today* — token system, typography, color register, hierarchy, component quality, and buyer-grade perception — and recommends a directional decision (dark-first vs. light-first vs. hybrid).

This document is **NOT**:

- An implementation plan. No code is written, no tokens are extracted, no components are refactored.
- A commit. No files are modified in `sourcedeck.html`, `main.js`, `preload.js`, `package.json`, `scripts/`, `services/`, `test/`, or `.github/`. No PR is opened. No stash is applied.
- A feature critique. Functional gaps, watsonx claims, signing/notarization, pricing, and compliance posture are out of scope.
- A live screenshot review. **No Playwright is installed in this repo and no headless screenshot path is wired for the Electron renderer.** This audit was performed entirely via static analysis of `sourcedeck.html` (CSS tokens, type stack, layout markers, section structure) and supporting documentation. The orchestrator did not attempt to launch the Electron app. Where this audit refers to "how the UI reads," the judgement is grounded in the actual CSS tokens, type stack, and DOM structure declared in the source — not in pixels observed at runtime. A pixel-accurate pass will be required before redesign sign-off.

---

## Audit methodology

Read-only static inspection of the following surfaces:

- **`sourcedeck.html`** — the entire renderer (10,779 lines, ~663 KB, HTML + CSS + JS inline). Three `<style>` blocks: lines 8–529 (global), 636–668 (scoped), 2051–2082 (scoped). Specifically inspected:
  - Lines 7 (Google Fonts import: Cormorant Garamond, Syne, Instrument Sans, IBM Plex Mono)
  - Lines 10–22 (the entire `:root` token block)
  - Lines 24–28 (the type-stack assignments to body, `.brief-head/.opp-title/.section-lede/.pane-lede`, `.nav-label/.kpi-label/.tb-kl/.sl/.label`, `.kpi-val`, `.brand-name`)
  - Lines 31–40 (topbar surface and macOS drag region)
  - Lines 770–789 (dashboard card region — confirms emoji icons and inline color overrides on `.card-title`)
- **`src/content/`** — content-only directory; confirmed no CSS or component primitives live here.
- **`build/` icons** — application icon assets (referenced for brand identity continuity, not modified).
- **`docs/demo/`**, **`docs/commercial-readiness/`**, **`docs/release-candidate/`** — narrative around demo flows, RC gates, and commercial framing; consulted to confirm which UI surfaces are demo-visible.
- **`README.md`** — top-level positioning language and entry points.

A prior SoHo × DC redesign exploration exists as a stashed WIP (`stash@{0}`); it was **not** applied for this audit and its contents are not referenced as ground truth.

---

## UI surface inventory

Surfaces enumerated by name as they appear in the renderer or are referenced in the demo / commercial-readiness documents. This is not an exhaustive DOM map; it is the buyer-visible surface set.

- **App shell** — sidebar (224px, collapsing to 216 / 196 / 176 / horizontal at the breakpoints below) + topbar (64px) + content well over `--bg:#07090F`.
- **Home / dashboard** — KPI tiles in Syne 800, "Today's Revenue Priorities" card, Activity Feed card, Stage Breakdown, Hot Leads (lines ~770–800).
- **GovCon workspace** — opportunity capture, pipeline, pursuit ledger surfaces (procurement-flavored content).
- **Operating profile / setup wizard** — onboarding flow for organization identity.
- **Opportunity review** — the surface where Cormorant Garamond italic `.opp-title` and `.section-lede` ledes carry editorial register.
- **Outreach / premium content area** — document-surface zones using `--parchment:#F2EDE3` and `--ivory:#F7F4EE` grounds with serif body. The only surface that already reads as "SoHo Atelier" in the current build.
- **AI provider readiness / watsonx readiness** — provider status panes using the `--purple:#A78BFA` AI accent and gradient bars.
- **Troubleshooting / diagnostics** — health, logs, environment.
- **Release evidence / support area** — RC gate evidence, support pointers.
- **Settings** — configuration surfaces; mostly default panel styling.
- **Modals** — dark navy with thin `#1C3050` borders and faint gold glow on hover.
- **Empty states** — generic muted text on dark panel; no editorial moment.
- **Status badges** — gradient bars in `--green`, `--warn`, `--red`.
- **Buttons / CTAs** — gold-leaning primary, navy secondary, crimson destructive.
- **Cards / panels** — `--panel`, `--panel2`, `--panel3`, `--panel4` deep-navy ladder with `--border:#1C3050` hairlines.
- **Tables / lists** — dense mono labels (`IBM Plex Mono` 8–10px uppercase letterspaced) over panel grounds.
- **Mobile / responsive** — sidebar collapses at **1180px**, **1024px**, and **900px** (full-width horizontal nav at ≤900px).

---

## Critique by criterion

### 1. First impression

The first impression today is "well-built operator console for a senior practitioner," not "premium civic command center for a buyer." The dominant ground is `--bg:#07090F` — effectively black — and the sidebar is dense with very small `IBM Plex Mono` 8px uppercase labels at `--dim:#2E4358` against deep navy panels, which reads as "developer tool" before it reads as "operations desk." A buyer landing on this screen for the first time would correctly infer that the product is serious and instrumented; they would not infer that it is worth $1,497–$5,997+. The serif and parchment moments that *would* carry the price tag are buried one or two clicks deep.

### 2. Visual identity

The identity is split. The editorial side is real and intentional — Cormorant Garamond italics for `.brief-head`, `.opp-title`, `.section-lede`, `.pane-lede`; Syne 800 for KPIs and the brandmark; parchment/ivory document surfaces; oxblood `--crimson:#8B1A2E` for destructive and alert states. The civic side is also real — IBM Plex Mono labels, navy panels, procurement-grade language. But the two sides are not in dialogue inside the shell. The serifs only appear inside individual document widgets, while the shell remains uniformly dark and mono. The identity therefore reads as "civic-dark with editorial Easter eggs" rather than "SoHo × DC."

### 3. Information hierarchy

Hierarchy is technically present but visually flat. KPI values in Syne 28px do separate from body, and the Cormorant ledes do break the visual rhythm where they appear. But the dominant nav and label tier is set at `--dim:#2E4358` — which is barely above the panel ground — so the navigation feels like a recessed afterthought rather than the authoritative spine of an operations desk. Section headers in mono uppercase at 8–10px are too small to anchor the eye; cards rely on subtle border-color overrides (e.g., `rgba(201,148,26,0.15)` on the Today's Priorities card at line 771) instead of a real hierarchy of weight, type, or surface. The result: everything looks roughly equally important, which means nothing reads as the marquee.

### 4. Layout discipline

The layout grid is disciplined and the breakpoint ladder (1180 / 1024 / 900px) is deliberate — that work is real and should be preserved. Sidebar width and topbar height are tokenized (`--sidebar:224px`, `--topbar:64px`), radii are tokenized (`--r:12px`, `--r2:8px`), transition is tokenized (`--t`). Where discipline breaks down is **inside** cards: card titles routinely override the token system with inline styles (`style="color:#60a5fa"` on the Activity Feed title at line 777, `style="color:var(--gold2)"` on the Today's Priorities title at line 772, gradient backgrounds inlined on the card itself). The grid is honest; the card interior is a mosaic of one-off decisions.

### 5. Typography

The type stack is the strongest part of the current build and the most defensible bridge to the target direction. Cormorant Garamond 600 italic for editorial ledes is on-brand for the SoHo register; Syne 800 with `-0.02em` tracking for KPIs gives the brand numerals real personality; IBM Plex Mono labels carry civic-ledger authority; Instrument Sans at 13px is a reasonable body workhorse. The problem is scale and color, not family choice: mono labels at 8px in `--dim:#2E4358` are too small and too low-contrast to feel authoritative, and the editorial serifs are rationed too sparingly to set the tone of the shell.

### 6. Color system

The palette is the weakest link against the target direction. `--gold:#C9941A` is a cool, slightly green-leaning ochre — on dark navy it reads as a UI accent token, not as warm brass. The signature warm-brass + oxblood + ivory triad the SoHo × DC direction promises is undermined every time gold appears. `--signal:#1B4D6E / --signal2:#2260A0` reads as generic-SaaS civic blue rather than as a distinctive DC register. `--purple:#A78BFA` for AI clashes with the rest of the palette — it is a Vercel-era violet, not a civic accent. `--bg:#07090F` near-black is below the contrast threshold a buyer expects from a "command center" — it reads as "terminal." The two ivories (`--parchment`, `--ivory`) are excellent but used only inside document surfaces. The crimson is the single accent that genuinely lands the target direction.

### 7. Component quality

Components are competent but not premium. Cards use a four-step panel ladder (`--panel` through `--panel4`) with `--border:#1C3050` hairlines and a faint gold glow on hover, which is a coherent system. Status indicators, however, are rendered as **gradient bars** — a CRM-app convention that immediately reads "operations dashboard product, 2019" rather than "editorial command surface." Buttons rely on color rather than type weight and surface to express hierarchy. Empty states are generic muted text. Modals reuse the panel system rather than introducing a distinct register. The component library is internally consistent but uniformly "operator tool," not "buyer-grade."

### 8. GovCon credibility

GovCon credibility is the area where the existing direction *almost* lands. IBM Plex Mono ledger labels, the deep navy panels, the procurement-flavored language, and the disciplined sidebar all signal "this product takes federal seriously." A federal contracting officer or a GovCon BD lead would not bounce off this UI — they would recognize it as a peer. The gap is that GovCon credibility today is doing **all** the visual work, with no editorial counterweight to elevate the product from "credible operator tool" to "the desk a serious firm would buy." Credibility without prestige reads as a $99/month product.

### 9. Premium perception

Premium perception is where the current UI most clearly underperforms its price target. The dominant aesthetic is "engineered console" — competent, technical, dense. Premium signals (warm metals, generous whitespace, editorial typography setting tone, restrained accent use, paper textures) appear only inside the document-surface widget and the KPI numerals. The price tag the product is asking for ($1,497–$5,997+) expects a UI that opens with a clear editorial moment — a serif title, a wide ivory ground, a single warm-brass accent — and then descends into command density. Today it opens at command density and rations the editorial moments. That sequence inversion is the single biggest perception drag.

### 10. Conversion / demo impact

On demo, the product will earn respect from technical evaluators and lose ground with buyers / sponsors / decision-makers who don't operate the tool themselves. The serif ledes inside the opportunity review and the parchment document surfaces will surface in mid-demo and pull the perception up. The opening shell — dark navy, near-black ground, tiny low-contrast mono nav labels, gradient status bars, emoji card titles ("📡 Activity Feed" at line 777, "⚡ Today's Revenue Priorities" at line 772) — will set the demo's first 10 seconds at "operator tool," and recovery is uphill from there. The conversion-critical moments (KPI tiles, the headline opportunity, the first document surface) need to *lead*, not appear three clicks in.

---

## Overall current UI score

**Score: 5.5 / 10** against the SoHo × Washington DC target direction.

This is RC-ready, internally consistent, and contains real editorial moments worth preserving — the Cormorant Garamond italic ledes, the parchment/ivory document surfaces, the Syne KPI display, and the oxblood crimson are all genuinely on direction and would survive a redesign untouched. The grid system, breakpoint ladder, and panel ladder are all disciplined. However, the dominant first impression is "operator tool built by engineers" rather than "premium civic command center built for buyers." The cool gold pulls warm-brass toward token-color territory, `--dim:#2E4358` mutes the nav into recession, near-black ground reads as terminal, gradient status bars and emoji card titles undercut prestige, and the editorial register is rationed instead of leading. A score above 7 requires inverting the editorial / command balance so that the shell *opens* civic-editorial and *descends* into command density — not the reverse.

---

## Dark / light strategy decision

### Option A — Keep dark-first, make it more premium

Stay on dark navy, replace cool gold with warm brass, lift `--dim` for nav contrast, swap gradient status bars for editorial chips, retire the emoji card titles, and introduce a thin parchment hairline accent. This is the lowest-risk path: existing components survive almost unchanged, and the cool-gold → warm-brass swap alone would lift perception noticeably. The ceiling is moderate, though — the product would read as "well-executed premium operator console," not as "buyer-grade civic command center." Dark-first inherently competes with the Vercel / Linear / Cursor aesthetic, which the SoHo × DC direction is explicitly trying to differentiate from.

### Option B — Move to light-first civic shell with dark command panels

Invert the ground entirely: ivory / stone shell, parchment-textured topbar, navy-on-ivory primary type, with dark navy reserved for command-density panels (pipeline, ledger, diagnostics). This lands the editorial register hardest and most clearly differentiates from the dark-developer-tool category. The risk is higher: every existing card style would need re-evaluation against an ivory ground, and `IBM Plex Mono` labels at 8px on parchment may need a different size/color treatment to remain legible. Dense data surfaces (lists, logs, diagnostics) read better on dark and would feel exposed on ivory unless explicitly cased as dark command zones.

### Option C — Hybrid: ivory/stone civic workspace with black/navy command zones and brass/oxblood accents

The default workspace ground becomes warm ivory / stone, with editorial Cormorant titles, IBM Plex Mono ledger labels in navy, and warm brass + oxblood as the only chromatic accents. Command-density surfaces — pipeline, diagnostics, logs, watsonx readiness, GovCon pursuit ledger — explicitly invert to deep navy / near-black panels embedded inside the ivory shell, with the dark panels framed by the ivory ground rather than filling it. This is a deliberate two-register system where each register signals what kind of work is happening in it.

**Recommendation: Option C (Hybrid).**

Three reasons grounded in the existing build:

1. **The parchment / ivory document surfaces already prove the editorial register works inside SourceDeck.** The Cormorant italic ledes on `--parchment:#F2EDE3` and `--ivory:#F7F4EE` grounds are the single most "SoHo × DC" thing in the current renderer. Option C makes that the *dominant* aesthetic of the shell rather than a widget-level exception.
2. **The navy / oxblood / mono-label zones already prove the civic command register works.** The current dark shell *is* the civic command register — it just happens to be doing 100% of the work. Option C preserves it inside command-density zones, where dense data legitimately reads better on dark, and removes it from surfaces where it is suppressing premium perception.
3. **Inverting which register is dominant flips first-impression positioning without inventing new components.** The same cards, KPI displays, sidebar structure, and breakpoint ladder can carry the hybrid; the change is token-level (grounds, accents, gold warmth, nav contrast) and surface-assignment-level (which panels are dark, which are ivory). Option C reuses existing patterns to shift the product's read from "developer tool" to "buyer-grade operations desk."

---

## Things the current UI already gets right

- **Cormorant Garamond italic ledes** (`.brief-head`, `.opp-title`, `.section-lede`, `.pane-lede` at line 25) — an editorial type voice already wired into the brand and used at the right moments.
- **Parchment / ivory document surfaces** (`--parchment:#F2EDE3`, `--ivory:#F7F4EE` defined at line 15) — the only surfaces in the build that already feel SoHo Atelier; survive any redesign.
- **Oxblood crimson accent** (`--crimson:#8B1A2E` at line 14) — exactly the right warm civic destructive color; reads as DC, not as "error red."
- **IBM Plex Mono ledger labels** (line 26: `.nav-label, .kpi-label, .tb-kl, .sl, .label`) — civic procurement register, correct family choice.
- **Syne 800 KPI display** (line 27: `.kpi-val { font-size:28px; letter-spacing:-0.02em }`) — KPI numerals have real personality and brand identity.
- **Deliberate small mono uppercase nav labels** (line 26) — the *idea* of a ledger-style nav spine is correct; only the color contrast is wrong, not the typographic intent.
- **Tokenized layout system** (line 22: `--sidebar:224px`, `--topbar:64px`, `--r:12px`, `--r2:8px`, `--t:all 0.22s ease`) — layout primitives are disciplined and tokenized; nothing magical about the numbers in markup.
- **Defined responsive breakpoints** (1180 / 1024 / 900px) — the sidebar collapse ladder is intentional, not improvised.

---

## Things actively hurting trust / demo value

- **`--dim:#2E4358` used for nav labels** — too low-contrast on dark navy; reads as a recessed afterthought, not as the authoritative spine of a command center.
- **Cool, slightly green-leaning gold** (`--gold:#C9941A`) — does not read as warm brass; reads as a UI token color. The single biggest blocker to premium perception.
- **Gradient status bars** for `--green`, `--warn`, `--red` indicators — CRM-app convention, immediately dates the product and undercuts editorial register.
- **Near-black `--bg:#07090F` ground** — reads as "developer command line / terminal" rather than "civic operations desk."
- **Single 10,779-line HTML file** with three `<style>` blocks (lines 8–529, 636–668, 2051–2082) — design tokens are locked inside a monolith with no token extraction, no component primitives separation; any redesign must extract tokens first or risk regressions in JS-rendered subtrees.
- **Emoji icons embedded in card titles** — "📡 Activity Feed" at line 777 and "⚡ Today's Revenue Priorities" at line 772 — clash hard with the editorial / civic register; these are Notion-doc icons, not buyer-grade UI.
- **Inline color overrides competing with the token system** — `style="color:#60a5fa"` on the Activity Feed title (line 777) is a hardcoded blue with no token entry, and `style="color:var(--gold2)"` on the Today's Priorities title (line 772) bypasses any card-title weight system. The token system is undermined at the leaf level.
- **`--purple:#A78BFA` AI accent** clashes with the civic palette — a Vercel-era violet has no place in a SoHo × DC accent set; AI status should ride the brass / oxblood / signal-blue system.
- **`--signal:#1B4D6E` / `--signal2:#2260A0`** read as generic-SaaS civic blue, not as a distinctive DC register — too desaturated to feel civic, too bright to feel editorial.
- **8px monospace uppercase nav copy with heavy letterspacing** — clinical / micro-label register, not authoritative; sized for a dashboard chrome, not for a command spine.
- **Document surfaces are isolated to widgets** — the parchment/ivory moments are the strongest editorial signal in the build, but they only appear inside document-surface zones and do not set the tone of the shell itself.
- **Card border colors set via inline `rgba(...)`** (e.g., `rgba(201,148,26,0.15)`, `rgba(26,111,168,0.12)` at lines 771–776) — card differentiation is one-off rather than systematic, and the card border becomes a one-off decision per card.

---

## Buyer / demo readiness verdict

Does the current UI justify a $1,497–$5,997+ buyer impression? **Not yet — but it can.** The underlying type system (Cormorant Garamond italic ledes, Syne KPI display, IBM Plex Mono ledger labels) and the accent system (oxblood crimson, parchment / ivory grounds) can absolutely carry premium positioning at that price point. The functional substance — GovCon workspace, opportunity capture, operating profile, AI provider readiness — is there at RC quality. What is pulling perception below the price tag is the *dominant register* of the shell: near-black ground, cool gold, low-contrast `--dim` nav, gradient status bars, and emoji card titles signal "operator tool built by engineers" within the first 10 seconds of a demo. A buyer who self-identifies as the operator (a senior capture lead, a federal BD director) will look past the shell and see the product clearly; a buyer who is the *purchaser* — the firm principal, the strategic sponsor — will not. The recommendation in Section 6 (Option C, hybrid ivory/stone civic workspace with embedded navy command zones) is the most direct path from today's 5.5 / 10 to a defensible 8+ / 10 against the SoHo × DC target.

---

## Out-of-scope deferrals

The following are **explicitly out of scope** for this audit:

- Feature work, new functionality, or any change to product behavior.
- Runtime changes (main process, preload, IPC surface, service workers).
- Package changes (`package.json`, `package-lock.json`, dependency additions).
- Code signing, notarization, publishing, auto-update configuration.
- Any watsonx live / IBM partnership / certified provider claims.
- Compliance posture claims (FedRAMP, SOC 2, CMMC, HIPAA, HITRUST, ISO 27001, government-compliant, etc.).
- Pricing changes, tier restructuring, or commercial commitments.
- Implementation of any visual change recommended above. Implementation is gated behind a separate operator decision and a separate work item.

---

## References

Files inspected for this audit (absolute paths):

- `/Users/jean-maxcharles/sourcedeck-app/sourcedeck.html`
- `/Users/jean-maxcharles/sourcedeck-app/main.js` (out-of-scope but identified)
- `/Users/jean-maxcharles/sourcedeck-app/preload.js` (out-of-scope but identified)
- `/Users/jean-maxcharles/sourcedeck-app/src/content/`
- `/Users/jean-maxcharles/sourcedeck-app/build/` (icon assets)
- `/Users/jean-maxcharles/sourcedeck-app/docs/demo/`
- `/Users/jean-maxcharles/sourcedeck-app/docs/commercial-readiness/`
- `/Users/jean-maxcharles/sourcedeck-app/docs/release-candidate/`
- `/Users/jean-maxcharles/sourcedeck-app/README.md`
