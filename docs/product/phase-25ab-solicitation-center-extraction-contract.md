# Phase 25AB — Solicitation Center Extraction Contract

## Intake Sources

Solicitation Center accepts:

- Downloaded SAM.gov solicitation packages
- Uploaded solicitation files/packages
- Saved pursuits with downloaded packages

The visible **Paste Solicitation Text** primary flow has been removed. Legacy paste handlers may remain deprecated for saved state compatibility, but runtime intake is package/upload centered.

## Supported Upload Types

The UI and service contract accept PDF, DOCX, DOC, XLSX, XLS, CSV, TXT, and ZIP. Text-like files are parsed directly. ZIP children are extracted locally. Binary formats without a safe parser are stored and shown as “Stored, text extraction not available yet.”

## Attachments Panel

After a package is selected, the panel shows file name, type/status, size where available, source, and actions:

- View
- Extract Text
- Include in Analysis
- Exclude from Analysis
- Open Local File

## Section Extraction

The extraction service scans included text and classifies Uniform Contract Format sections:

- Part I: Sections A-H
- Part II: Section I
- Part III: Section J
- Part IV: Sections K-M

Missing sections never produce demo text. They show: “No Section [X] extracted yet. Verify source package.”

## Additional Extraction Targets

The service also extracts solicitation metadata, set-aside, NAICS, PSC/classification, response deadline, Q&A deadline, site visit, POC/COR/CO clues, place of performance, deliverables, pricing/CLIN clues, required forms, compliance risks, ambiguity flags, subcontractor-relevant scope, and attachments index.

## Plain-English Explanation

**Explain Package in Plain English** summarizes each section A-M in simple language, flags missing sections and high-risk compliance items, and reminds the user it is not legal advice and must be verified against source documents.
