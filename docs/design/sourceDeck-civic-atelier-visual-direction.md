# SourceDeck Civic Atelier — Recommended Visual Direction (v1)

> Scope: visual-direction recommendation only. No implementation, no commits, no claims about certifications or live integrations. Static-source analysis of `sourcedeck.html` (10,779 lines, three inline `<style>` blocks). Live Electron screenshots were not captured — no Playwright is installed and no headless screenshot path for the Electron renderer is wired in this repo. The orchestrator did not launch the app. All observations below are grounded in the inline CSS tokens, type stack, layout markers, and section structure visible in the source. A prior SoHo×DC redesign WIP exists in a preserved stash; it has not been applied or inspected here.

## Visual thesis

SourceDeck v1 should read as **SoHo × Washington DC**: the editorial calm and gallery whitespace of a downtown design atelier, fused with the briefing-room discipline of a federal command desk. The product is a premium command center for serious GovCon operators — the people who sit across the table from a contracting officer, not the people who chase blog-post leads. Today's shell defaults to a dark-navy "developer command line" register; the editorial register only surfaces inside isolated document widgets. We are inverting which register dominates.

The existing `Cormorant Garamond` italic ledes and parchment `doc-surface` blocks already in `sourcedeck.html` are proof points — they are the most premium moments in the entire app. The recommendation is to promote those moments from "inside a card" to "the shell itself," and to retreat the dark federal-navy surfaces into a single, intentional operational zone (live status, focus mode). This direction rejects three failure modes simultaneously: SaaS-startup gradients, government-flat beige, and Bloomberg-terminal density theater. Honest current score for premium-buyer perception: **6 / 10** — the bones are right, the dominant ground is wrong.

## Mood

The felt experience is **editorial calm with civic gravity**. A buyer should open the app and feel the same posture they feel walking into a well-lit Federal Triangle reading room: hush, weight, and an implicit assertion that the work done here is auditable. Whitespace is generous, not anxious. Type does the heavy lifting, not color. The accent metals — warm brass and oxblood — are restraints, not flourishes; they appear where authority lives, and nowhere else.

The product is **procurement-grade**: every surface should look like it could be printed out, signed in ink, and filed. No "AI hype" shimmer. No startup playfulness. No government-flat beige PDF aesthetic. The line is brass-and-ink restraint — the visual equivalent of a navy suit, white shirt, leather portfolio. Quiet enough to be trusted, sharp enough to be remembered.

## Recommended palette (controlled system)

| Role | Token name | Hex | Where it appears |
|---|---|---|---|
| Ground / page (primary canvas) | `--ivory` | `#F6F1E8` | Default app background — replaces dark `#07090F` as the dominant ground across sidebar, topbar, dashboard, settings, all secondary views |
| Parchment surface (card / panel) | `--parchment` | `#E8DDC8` | Editorial cards, brief columns, document zones, active nav fill, modal center panel |
| Stone border / hairline | `--stone` | `#D6C8AE` | All hairline separators: sidebar dividers, table row rules, card borders, topbar underline |
| Ink display type / strong text | `--ink-navy` | `#111827` | All display type, headings, body emphasis, primary button fill, icon strokes |
| Federal navy (briefing-room command zones) | `--federal-navy` | `#172033` | Live operational status panel only — system health, active scans, real-time pipeline state |
| Obsidian (deep command surfaces) | `--obsidian` | `#0B0B0A` | Hero focus modes, full-screen briefing presentation mode — used sparingly |
| Brass gold (accent / authority highlight) | `--brass` | `#B08A3C` | Active nav left-rule, KPI underline rules, secondary button outline, hairline accents under section heroes; replaces cool `--gold:#C9941A` |
| Oxblood (critical alerts / strong status) | `--oxblood` | `#6E1F2C` | Blocker alerts, hard-fail status, must-act-now chips. Existing `--crimson:#8B1A2E` is acceptable as a slightly brighter warning-chip variant; pick one and hold it system-wide |
| Bureau gray (secondary text, labels) | `--bureau-gray` | `#6B7280` | Civic-ledger nav labels, table column headers, metadata, timestamps; replaces low-contrast `--dim:#2E4358` |
| Alert red (hard fail / blocker) | `--alert-red` | `#B42318` | Inline form errors, destructive confirmations |
| Success green (verified / pass) | `--success-green` | `#2F6B4F` | Verified status chips, passed checks, completed audit items |

**Restraint rule.** Not every color appears in every screen. Brass and oxblood are accents, not fills — a single brass rule under a KPI strip is the entire brass budget for that screen. A dashboard with no oxblood means nothing is blocking; that is information. The default screen is **ivory + ink + stone hairlines**, with one brass moment and zero oxblood. Federal navy appears in exactly one zone per screen.

## Typography direction

Keep the existing stack — it is already on-thesis. The change is **promotion and contrast**, not replacement. `Cormorant Garamond` italic is the editorial spine; today it only appears inside `doc-surface` widgets and section ledes. Promote it into section heroes, briefing-cover titles, panel ledes, empty-state phrases, and modal headlines. `Instrument Sans` remains the body face, but at **14–15px on ivory** rather than 13px on near-black — readability and premium air both improve, and the small-text-on-dark "engineering tool" register dissolves.

`IBM Plex Mono` (and the existing `Azeret Mono` fallback) is the civic-ledger label face: small caps, uppercase, generously tracked, used for nav labels, table headers, metadata, status-chip labels, and date/build/status ledger strips in the topbar. The current nav uses `--dim:#2E4358` on dark — labels read as afterthought. Move to `--bureau-gray:#6B7280` on ivory ground; labels now read as civic-ledger authority. `Syne` 800 is reserved for KPI numerals — the one place where geometric modernity is welcome, because it makes numbers feel like instrument readings rather than copy.

**Specimen table.**

| Role | Font | Weight | Size / line | Case | Tracking |
|---|---|---|---|---|---|
| Display heroes | Cormorant Garamond italic | 600 | 36 / 40 | Sentence | -1% |
| Section / page titles | Cormorant Garamond italic | 600 | 28 / 32 | Sentence | -1% |
| Panel ledes | Cormorant Garamond italic | 600 | 22 / 28 | Sentence | 0 |
| Body | Instrument Sans | 400 | 14 / 22 | Sentence | 0 |
| Body emphasis | Instrument Sans | 600 | 14 / 22 | Sentence | 0 |
| Civic labels (nav, table headers, chips) | IBM Plex Mono | 600 | 10 / 12 | UPPERCASE | +12% |
| Metadata / timestamps | IBM Plex Mono | 500 | 11 / 14 | Sentence | +4% |
| KPI numerals | Syne | 800 | 28 / 28 | — | -2% |
| Large KPI numerals (hero strip) | Syne | 800 | 40 / 40 | — | -2% |

## Layout system

**Grid.** 12-column desktop with generous 24–32px gutters, 64px outer margin on ≥1280px, 32px on 1024–1279px. Editorial whitespace is a feature: a dashboard that looks 60% empty is the goal, not a bug. All vertical rhythm rides an **8-pt baseline**. Topbar fixed at **64px**, sidebar **240px** (a small bump from today's 224 to let the Cormorant brand mark and Plex Mono labels breathe).

**Spacing scale.** `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`. Anything else is a mistake. **Corner radii.** `8` for chips and small inputs, `12` for cards and panels, `16` for hero cards and modal sheets, `0` for ledger rows and table cells (civic typesetting is square). **Elevation.** Extreme restraint:

- Default surfaces: no shadow. A single 1px `--stone` hairline border.
- Hero cards and modals only: 1px `--stone` hairline + one soft ink shadow `0 1px 2px rgba(17,24,39,0.04), 0 8px 24px rgba(17,24,39,0.06)`.
- Hover: hairline border deepens from `--stone` to `--ink-navy` at 12% opacity. **No glows, no lifts, no color washes.**

## Navigation model

The sidebar is a **civic ledger** on ivory ground, 240px wide, with hairline `--stone` separators between sections. Section group labels are IBM Plex Mono uppercase on `--bureau-gray` — high enough contrast on ivory to read as authoritative, low enough to recede from the active item. The brand mark sits at top in `Cormorant Garamond` italic at 22/28, not in Syne — the shell itself should declare the editorial register.

Active item: warm `--parchment` fill, a 2px `--brass` left-rule, ink-navy label, mono micro-label still visible. Inactive items: transparent fill, ink-navy label at 80%, no left-rule. Hover: `--parchment` at 50% opacity, no border change. The topbar is ivory with a single signature inline ledger across the right side — `DATE · BUILD · STATUS` in IBM Plex Mono on `--bureau-gray`, separated by `·` glyphs. Page title sits left in Cormorant italic. The command pill (search / quick action) sits center-right, ink-navy outline on ivory, no fill. One hairline `--stone` rule underlines the entire topbar.

## Dashboard model

A briefing-room layout, top to bottom: (1) **editorial hero KPI strip** — three to five KPIs across, Syne 800 numerals on warm ivory, each numeral underlined by a 1px `--brass` rule, IBM Plex Mono caption beneath in `--bureau-gray`. (2) **Ledger command tables** — IBM Plex Mono uppercase column headers on a `--stone` underline, tabular-nums body in Instrument Sans, no zebra stripes, row separators are 1px `--stone` hairlines. (3) **Parchment "Today's brief" column** on the right — a `--parchment` card with a Cormorant italic lede ("Three captures await your signature."), followed by three to five linked items in Instrument Sans.

`--federal-navy` is reserved for the **single live operational status panel** — typically lower-right or as a slim docked strip. This is the only dark surface on the default dashboard. It carries real-time signal: active scans, queue depth, live integrations. Inside it, KPI numerals shift to ivory text on federal-navy ground; everywhere else, the dashboard stays light. This single navy zone reads as the "ops desk inside the gallery" — exactly the SoHo × DC fusion.

## Component style

### Buttons

- **Primary:** `--ink-navy` fill, ivory label, no border, no shadow, 8px radius, 12/16 padding, Instrument Sans 600 14px. Hover: fill darkens 8%.
- **Secondary:** transparent fill, 1px `--brass` border, ink-navy label. Hover: fill becomes `--parchment` at 60%.
- **Ghost / tertiary:** text-only, ink-navy label, underline on hover in `--brass`. Used for inline actions in tables and cards.
- **Destructive:** `--oxblood` fill, ivory label. Used only when the action cannot be undone.

### Status chips

Replace today's `.s-high` / `.s-mid` / `.s-low` **gradient bars** entirely. New chips are typography-led: IBM Plex Mono uppercase label, 10/12, +12% tracking, ink-navy text on ivory ground, 1px hairline border in the role color, 8px radius, 4/10 padding. Verified chips border `--success-green`, caution chips border `--brass`, blocker chips border `--oxblood`. No fills, no gradient strips, no dots, no animations.

### Cards / panels

`--parchment` ground (or ivory for the lightest tier), 1px `--stone` border, 12px radius, 24px internal padding. Optional Cormorant Garamond italic lede at the top sets the editorial register. Body in Instrument Sans 14/22. No shadow at rest. Hero cards may take the single soft ink shadow defined in the layout system. Cards never use the deep navy panels currently in use.

### Tables / ledgers

Civic typesetting. Column headers in IBM Plex Mono 10/12 uppercase `--bureau-gray`, separated from body by a single `--stone` hairline. Body rows in Instrument Sans 14/22 ink-navy. **No zebra stripes.** Row separators are 1px `--stone` hairlines. Numerals are tabular (`font-variant-numeric: tabular-nums`) in Instrument Sans — or Syne 800 when the cell is a primary KPI. Right-align all numeric columns. Row hover: row background goes `--parchment` at 30%.

### Forms

Ivory page ground. Inputs sit on `--parchment` with 1px `--stone` border and 8px radius; on focus the border becomes 1px `--ink-navy` and a 1px `--brass` underline rule appears beneath the input. Labels in IBM Plex Mono 10/12 uppercase `--bureau-gray` above the input. Helper text in Instrument Sans 12/16 `--bureau-gray`. Error state: 1px `--alert-red` border and inline message in `--alert-red`.

### Modals

Centered `--parchment` panel on an ivory-dim overlay (`rgba(246,241,232,0.86)` with a 1px `--stone` border on the panel). **Never** a black or navy overlay — the SoHo gallery does not dim to black. Modal title in Cormorant Garamond italic 22/28, body in Instrument Sans 14/22, primary action ink-navy button, secondary action ghost. Close affordance is a small monoline `×` in `--bureau-gray` top-right.

### Alerts

`--oxblood` reserved for blockers (must-act-now, hard-fail, awarded-to-competitor). `--brass` for cautions (review-required, expiring-soon). `--success-green` for verified (audit-passed, capture-confirmed). All alerts are 1px hairline border in the role color on a parchment ground, with a Cormorant italic lede line and an Instrument Sans body. No filled banners, no exclamation icons, no shake animations.

### Empty states

Editorial. One Cormorant Garamond italic phrase (e.g., "No captures yet. The briefing room is quiet."), one 1px `--brass` hairline rule beneath it, one civic action button. No mascots, no AI sparkles, no illustrations. The empty state is the most premium moment in the app — treat it accordingly.

## Icon style

Adopt a single monoline civic-editorial icon set — **Lucide** is the recommended baseline, or a similarly restrained set such as Phosphor (regular weight). Consistent **1.5px stroke**, rounded line-caps, no fills. Default stroke color is `--ink-navy`; active or accent icons take `--brass`. The inline emoji currently in the source (e.g., the 📡 in "📡 Activity Feed" near line 777) and any other emoji in headers, buttons, or chips must be replaced with monoline glyphs — emoji read as consumer-app and break the civic register instantly. Icon size scale: 16 / 20 / 24px, aligned to the 8-pt baseline.

## Motion style

Restrained, editorial. Standard transition is **180–240ms cubic-bezier(0.2, 0.0, 0.0, 1.0)** for color, border, and opacity changes. No bouncy springs. No flashy hovers. Status changes use a single 240ms color crossfade — never a flip, flash, or pulse. Page transitions are a 12px parchment lift (opacity 0→1 and translateY 12px→0) over 220ms — never a horizontal slide. Loading uses a single 1px `--brass` indeterminate hairline at the top of the affected card, no spinners.

## Data / status style

All numerals are **tabular-nums**, always, everywhere. KPI numerals in Syne 800 with -2% tracking; in-table numerals in Instrument Sans tabular. Status is **typography-led**, not color-led: the chip's mono label carries the meaning, the hairline border carries the role tint, and that is the entire visual system. The existing gradient-bar indicators (`.s-high`, `.s-mid`, `.s-low`) read as CRM-app and must be retired. Percent deltas use a small monoline arrow glyph in the role color, never a colored pill background.

## Empty-state style

Editorial. One Cormorant Garamond italic line at 22/28 ink-navy. One 1px `--brass` hairline rule, 64px wide, centered beneath it. One civic action — a secondary button with brass outline. That is the entire composition. No mascots, no AI sparkles, no "Get started" illustrations, no emoji. The buyer who lands on an empty state in a demo should think *"this product respects me"* — not *"this product is trying to be friendly."*

## Demo-story style

The first **10 seconds** of a demo must say "premium command center." Open on the briefing-room dashboard — **never** on the settings screen, the integrations screen, or a loading state. The first frame the buyer sees is: brand mark in Cormorant italic top-left, Cormorant italic page title beneath the topbar, the hero KPI strip with Syne numerals underlined in brass, and one civic-ledger command table beneath. The federal-navy live-ops panel sits docked lower-right, doing its quiet work. No modals, no tooltips, no popovers in the opening frame. The room is composed before the demo even begins.

## Verbatim restraint guardrail — we will NOT do

- No marketing gradients (no purple-to-pink, no navy-to-teal, no gradient buttons, no gradient backgrounds).
- No purple AI mysticism (`--purple:#A78BFA` is removed from the public surface; if AI is present, it speaks in ink, not violet).
- No startup playfulness (no rounded cartoon mascots, no confetti, no Lottie animations, no "🎉" copy).
- No military-cosplay (no camo, no stencil type, no challenge-coin iconography, no "tactical" anything).
- No government-flat beige (no Times New Roman, no `#F5F5DC` manila, no 1990s PDF aesthetic — parchment is warm and considered, not flat and dated).
- No compliance-claim badges of any kind.
- No "watsonx live" hero or any claim that watsonx is running in production in the shell.
- No "signed" / "notarized" / "FedRAMP" / "SOC 2" / "CMMC" / "HIPAA" / "ISO 27001" badges anywhere in the UI.
- No "AI-powered" or "intelligent" copy in headlines.
- No guaranteed-outcome language ("guaranteed contract," "win rate," "award rate") in any visible surface.
