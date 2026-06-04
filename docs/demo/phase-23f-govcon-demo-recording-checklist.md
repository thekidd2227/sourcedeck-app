# Phase 23F — GovCon Buyer Demo Recording Checklist

**Date:** 2026-06-04
**Use:** Pre / during / post checks for recording the SourceDeck GovCon Capture OS demo video.
**Pair with:**
- `docs/demo/phase-23f-govcon-demo-master-script.md` (narration)
- `docs/demo/phase-23f-govcon-demo-shot-list.md` (storyboard)

---

## 0. Branch / commit posture

- [ ] On `main` at HEAD `c002486` (Phase 23E) or newer. Confirm with `git log --oneline -1`.
- [ ] Working tree clean except pre-existing `.codex/` and local `.tmp/` scratch. Confirm with `git status --short`.
- [ ] Stashes untouched. Confirm `git stash list` matches the entries you expected before this session.
- [ ] No uncommitted edits to `sourcedeck.html`.

## 1. Signed-build posture

This is the buyer-facing honesty check. **The build you are about to record is an unsigned development build for demo purposes** unless ALL seven gates of the Phase 23E verification chain have passed for the specific artifact you are running:

1. `npm run release:mac-signing-readiness:strict` exits 0 with every required env present.
2. `npx electron-builder --mac` ran with `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` populated (via the Phase 23E `signed-demo-build.yml` workflow or an equivalent local path).
3. `node scripts/release-check.js` passes with no privacy-gate failure and no "code object is not signed at all" warning.
4. `codesign --verify --deep --strict --verbose=2 <SourceDeck.app>` reports valid + satisfies its Designated Requirement.
5. `spctl --assess --type execute --verbose=4 <SourceDeck.app>` reports `source=Notarized Developer ID` or equivalent.
6. `stapler validate <SourceDeck.app>` and the DMG both validate.
7. `npm run release:evidence:strict` writes a Markdown + JSON report under `reports/release-evidence/` that includes signed-verified status.

- [ ] If **all 7 gates have passed for this artifact** → you may use the language "signed-demo candidate verified through the Phase 23E chain". You may NOT yet say "publicly released" or "production signed" — that is the publish path (`build-release.yml`), not this candidate.
- [ ] If **fewer than 7 gates have passed** → use the **unsigned-build caveat** from §12 of the master script verbatim: *"This is an unsigned development build for demo purposes."* Do not say "signed and notarized". Do not say "Apple notarized". Do not say "production signed". Do not promise a future signed build during the demo unless you have a written commitment from release engineering.

## 2. Pre-launch safety scan

Run these in order. Each must pass before the camera turns on.

- [ ] `node test/govcon-demo-delivery-polish.test.js` — 26/26 PASS
- [ ] `node test/govcon-primary-navigation.test.js` — 23/23 PASS
- [ ] `node test/govcon-mode-navigation.test.js` — 17/17 PASS
- [ ] `node test/govcon-demo-polish.test.js` — 27/27 PASS
- [ ] `node test/remove-system-readiness-tab.test.js` — 9/9 PASS
- [ ] `node test/renderer-boot.test.js` — 7/7 PASS
- [ ] `npm test` — every test file PASS
- [ ] `npm run troubleshooting:scan` — no critical/high findings
- [ ] `npm run i18n:audit` — 31/31 PASS
- [ ] `node scripts/release-check.js` — PASS (the local-dev `code object is not signed at all` warning is expected if the build is unsigned)

## 3. Pre-launch screen-area sweep

- [ ] No real customer PII, real solicitation text from another engagement, real vendor contact info, real API keys, real Apple ID / Team ID, real `.p12` filename, or real CAGE/UEI/SAM numbers in any browser tab, Finder window, code editor, terminal, or notification on your desktop.
- [ ] All browser tabs closed except the one you intend to use for the split-screen Markdown view.
- [ ] All Electron devtools windows closed.
- [ ] Slack / Mail / Messages set to Do Not Disturb. Notifications silenced.
- [ ] Screen recording target window is SourceDeck only. No system menu bar copy, no other app window in frame.
- [ ] Display resolution at the recording resolution (1440 × 900 recommended).

## 4. App launch + cold-open verification

- [ ] Launch SourceDeck. The FIRST frame must show the GovCon Capture OS tab as active (Phase 23C default-active). If the first frame is `tab-dashboard`, STOP and investigate — Phase 23C regression.
- [ ] Top-left brand sub-label reads **"GovCon Capture OS"**.
- [ ] GovCon Mode indicator is visible in the GovCon pane.
- [ ] Demo Mode block is visible with **Load Sample GovCon Demo Data** and **Clear Sample Demo Data** buttons.
- [ ] All five Phase 23D **Last Updated** chips read **"Last updated: Not yet"**. If any chip already shows a timestamp before the first user action of the recording, STOP — Phase 23D regression (cold-open faked a stamp).
- [ ] Sidebar: first nav-section is GovCon Capture OS. **Other business tools — Shown** toggle is visible. Six "Other business tools · X" sections below it.
- [ ] No System Readiness or System Flow tab anywhere. If one is present, STOP — Phase 21F regression.
- [ ] No Send Email / Submit Bid / Submit Quote button anywhere. If one is present, STOP — Response Desk / GovCon regression.

## 5. During-recording: sample-data flow

- [ ] Click **Load Sample GovCon Demo Data**. Wait ~3 seconds for the chips to stamp via the Phase 23D polling loop. Confirm all five chips show real timestamps.
- [ ] Every section you reference on camera must have a corresponding **Last Updated** chip with a real timestamp. If any chip is still "Not yet" after sample data has loaded, that section's storage key didn't update — pause and investigate before continuing.
- [ ] When you click **Build Package Preview**, the rendered preview footer must read: *"Internal review preview only. SourceDeck does not submit, upload, email, or transmit this package."*
- [ ] When you click **Export Internal Review Markdown**, the saved file must:
  - have a filename ending `INTERNAL-REVIEW-DRAFT.md`
  - open with `# INTERNAL REVIEW DRAFT — NOT SUBMITTED` on line 1
  - contain the no-submit blockquote
  - contain the `SAMPLE DEMO DATA — Replace before proposal use.` warning (because Demo Mode is active)
  - end with `END OF INTERNAL REVIEW DRAFT — NOT SUBMITTED`
  - If any of these are missing, STOP — Phase 23D regression.

## 6. During-recording: language discipline

- [ ] Say the positioning verbatim at the start: *"SourceDeck is a GovCon Capture OS that helps contractors move from opportunity discovery to submission-ready package preparation with human-approved workflows."*
- [ ] Say the safety language verbatim within the first 90 seconds: *"SourceDeck prepares internal review materials. It does not submit, upload, email, or transmit bids, quotes, or government responses."*
- [ ] Re-say the safety language when you click any Export / Build Package / Mark Reviewed control.
- [ ] If a buyer pushes a forbidden phrase at you ("does it submit my bid?", "is it FedRAMP certified?"), do not nod. Repeat the positioning + safety language and continue.
- [ ] Do not improvise the unsigned-build caveat — use §12 of the master script verbatim.

## 7. Hard stop conditions (during recording)

Stop the recording IMMEDIATELY if any of these appear on screen:

- [ ] A Send Email / Submit Bid / Submit Quote button anywhere.
- [ ] A System Readiness or System Flow tab in the sidebar.
- [ ] Any "SourceDeck is signed and notarized" / "Apple notarized" / "FedRAMP certified" / "SOC 2 certified" / "CMMC certified" / "HIPAA certified" / "HITRUST" / "ISO 27001" copy.
- [ ] Any "watsonx live" copy.
- [ ] Any positive "package submitted" / "bid submitted" / "quote submitted" / "government response submitted" / "portal upload completed" copy.
- [ ] Real customer PII / real solicitation from another engagement.
- [ ] Markdown export missing the SAMPLE DEMO DATA banner while Demo Mode is active.
- [ ] Markdown export missing the INTERNAL REVIEW DRAFT — NOT SUBMITTED header or footer.
- [ ] Boot-time SyntaxError / ReferenceError / TypeError in the Electron console.

## 8. Post-recording: clear sample data

- [ ] Click **Clear Sample Demo Data**. Confirm capture board / solicitation workspace / vendor / past performance / submission gate all reset to empty / default.
- [ ] Optional: delete `sd.govcon.demoDelivery.lastUpdated.v1` from localStorage if you want the next recording to cold-open with five "Not yet" chips.

## 9. Post-recording: storage of generated media

**Generated video and screenshot files MUST land in `/tmp` or `.qa/` only. They MUST NOT be committed.**

- [ ] Screen recording saved to `/tmp/phase-23f-demo-<YYYYMMDD>-<take>.mov` (or `.qa/recordings/` if a project-local copy is needed for editing).
- [ ] Screenshots saved to `/tmp/phase-23f-demo-<YYYYMMDD>-<shot>.png`.
- [ ] No video / no screenshot file appears under `git status`. Confirm with: `git status --porcelain | grep -E '\.(mov|mp4|m4v|webm|gif|png|jpg|jpeg)$'` returns empty.
- [ ] The recording chain (raw → edit → finalize) never writes inside the repo working tree.
- [ ] If a finished video must be shared with a buyer, upload it to the team's existing video channel (Drive, Loom, Vimeo private link) and reference the link in your call notes — do not put the file in `git`.

## 10. Optional Playwright/Electron dry-run

If you want to validate the cold-open + sample-data flow without a human take, use the headless chromium harness pattern that the Phase 23C/23D runtime sanity scripts demonstrate (`/tmp/phase23c-visual-sanity.mjs`, `/tmp/phase23d-visual-sanity.mjs`).

> ⚠️ Phase 23F does NOT add a new committed Playwright recording script. The existing visual-sanity harnesses are intentionally `/tmp/`-only — adding a committed recording harness would couple the repo to Playwright as a release dependency. Phase 23F-A below tracks the eventual committed version.

Suggested local-only dry-run command (NOT committed):

```
# Spin up the static-server pattern from the existing visual-sanity harnesses,
# load sourcedeck.html, exercise Load Sample → Build Preview → Export Markdown.
# Capture screenshots into /tmp only. Do not git add anything that lands there.
node /tmp/phase23f-dry-run.mjs   # (operator writes this locally; not committed)
```

- [ ] Dry-run output (if any) is written to `/tmp` or `.qa/` only.
- [ ] No new file appears under `git status` after the dry-run.

## 11. Post-recording: final QA pass

- [ ] Re-run `node test/govcon-demo-delivery-polish.test.js` — still 26/26 PASS.
- [ ] Re-run `node test/govcon-primary-navigation.test.js` — still 23/23 PASS.
- [ ] Re-run `node test/renderer-boot.test.js` — still 7/7 PASS.
- [ ] Re-run `npm run troubleshooting:scan` — no new critical/high findings.

## 12. Deferred items (Phase 23F-A and onward)

- **23F-A** Committed Playwright/Electron recording harness with a `.qa/recordings/` git-ignored output target.
- **23F-B** Branded final-frame closing card (Cormorant Garamond title, IBM Plex Mono sub-copy) generated from a local SVG, not from network fonts.
- **23F-C** Captioning / subtitle generation for the recorded narration, local-only transcription.
- **23F-D** Buyer-specific narration templates derived from the Phase 22G QA Q&A bank.
