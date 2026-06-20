# Fetch Links Rebuild Working Notes

## Controlling Instruction From Pasted Content 11

The existing automatic SAM.gov package/download workflow has been removed. The next product requirement is to rebuild a fresh, user-commanded SAM.gov link-fetch feature as a gold **Fetch Links** tab/control. SourceDeck must use the SAM.gov API key entered by the user, fetch required links only for the selected SourceDeck opportunity on command, and preserve the manual solicitation upload/extraction workflow without touching it unless integration glue is required.

## Architecture Boundary

The new feature must not resurrect automatic package download, automatic attachment download, background retrieval, renderer-side credential handling, or arbitrary remote bytes flowing into extraction. It retrieves link metadata on explicit user action, strips/redacts API keys before renderer display or persistence, and sends users to their browser for downloads before manual upload.

## Official SAM.gov API Constraints Captured From https://open.gsa.gov/api/get-opportunities-public-api/

The Get Opportunities API returns published opportunity details synchronously and requires pagination. The `api_key`, `postedFrom`, and `postedTo` request parameters are required for v2 search requests. The response can include `description`, which is a link to the opportunity description, and `resourceLinks`, which are direct URLs to download attachments/resources linked to the opportunity. The API supports filters such as `noticeid`, `solnum`, title, NAICS (`ncode`), classification (`ccode`), set-aside, dates, state, ZIP, organization code/name, limit, and offset.

## Implemented Boundary

The implementation adds `sam.fetchLinks(input)` to the app API and exposes it through an explicit `govcon:sam-fetch-links` IPC handler and preload bridge. The renderer adds a **Fetch Links** button beside **Open Official SAM.gov Listing** and **Upload Solicitation Files**. The service returns sanitized link metadata objects only. It strips `api_key` and `apikey` query parameters, rejects non-http URLs, deduplicates links, and marks every returned link as requiring manual browser download.

## Preserved Manual Workflow

The user workflow remains: search SAM.gov, save pursuit, optionally fetch link metadata, open official SAM.gov/browser links manually, download documents in the browser, then use **Upload Solicitation Files** to import local files into Solicitation Center. SourceDeck does not download remote solicitation files.

## Files Changed

| File | Purpose |
|---|---|
| `services/govcon/sam-search.js` | Adds sanitized metadata-only `fetchLinks` service and link collection helpers. |
| `services/sam/index.js` | Re-exports the new helper for testability and future callers. |
| `api/index.js` | Adds `govcon.sam.fetchLinks`. |
| `main.js` | Adds sanitized `govcon:sam-fetch-links` IPC handler and input sanitizer. |
| `preload.js` | Adds renderer bridge method `window.sd.govcon.fetchLinks`. |
| `sourcedeck.html` | Adds Fetch Links UI, display panel, persistence back to saved pursuit, and no-download messaging. |
| `test/remove-sam-solicitation-download-retrieval.test.js` | Keeps the removal regression while allowing the explicit metadata-only link fetch path. |

## Validation So Far

| Check | Result |
|---|---:|
| `require('./api/index.js')` | Pass |
| `require('./services/govcon/sam-search.js')` | Pass |
| `node test/remove-sam-solicitation-download-retrieval.test.js` | Pass, 31 checks |

## Current Caveat

The work is currently local on top of `main` at `fd511a0`. It should be moved to a dedicated branch before PR creation. The temporary patch script `tmp_add_fetch_links.js` is not part of the intended commit and should be removed before final packaging.
