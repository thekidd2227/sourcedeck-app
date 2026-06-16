# Phase 25W — Saved Pursuit → Solicitation Intake

The workflow repair: a saved SAM.gov pursuit becomes usable source material
the user can explore, fetch, import, and extract from.

## Saved Pursuits — Source Materials
Each saved/pursuing row exposes:
- **View Details** — expands the Source Materials panel.
- **Open SAM.gov Notice** — opens `uiLink`/`sourceUrl` (key-free); warns that a
  SAM.gov login/role may be required.
- **Source Materials** — description fetch + status, resource links /
  attachments (Open Source · Import to SourceDeck), point of contact, place of
  performance, notice metadata.
- **Refresh Source Details** — re-fetches by `noticeId`/`solnum` through the
  credential boundary and merges refreshed safe metadata.
- **Send to Solicitation Workspace** — sets the active solicitation and opens
  the Solicitation tab loaded with this pursuit.

(The pre-25W "View Source" button had a scope bug — `onclick` referenced an
out-of-scope variable so it silently failed. It is replaced by the global,
id-keyed handlers above.)

## Solicitation Workspace
Selecting a saved pursuit (selector `#gc-sol-opp-select`):
- loads opportunity metadata into the Solicitation Summary;
- renders the **Source Materials** panel (`#gc-sol-source-materials`) with the
  fetched description and resource links;
- lets the user paste additional text and upload local files manually.

## Extract Requirements (linked source)
`gcSolExtract` combines pasted text with `gcW25CollectSourceText()` — the
fetched description + imported resource text for the active solicitation:
- with source text → structured output: Solicitation Summary, Section L,
  Section M, PWS/SOW, Required Forms, Deadlines, Risks, Compliance Matrix
  Starter;
- with only metadata → "Paste solicitation text or fetch/import source
  materials before extraction." (it never pretends).

## Local source-material store
`localStorage` key `sd.govcon.sourceMaterials.v1`, keyed by pursuit id:
`{ description: { text, fetchedAt, status, sourceUrlSafe }, resources: [{ savedPursuitId, fileName, sourceUrlSafe, mimeType, downloadedAt, text, analysisStatus }] }`.

## Safety
Local intake only. No upload, email, send, or submission. The SAM.gov key
never appears in the URL, UI, or logs. No legal-certification claim.
