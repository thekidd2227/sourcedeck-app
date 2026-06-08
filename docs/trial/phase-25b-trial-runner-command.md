# Phase 25B — Trial Runner Command Checklist

**Date:** 2026-06-08
**Audience:** the operator running the 7-day internal trial locally.
**Companion docs:** `docs/trial/phase-25b-7-day-internal-trial-plan.md`, `docs/trial/phase-25b-daily-test-checklist.md`.

A simple local command checklist for each trial day. Copy-paste these commands locally. Do not commit screenshots, videos, log files, or `.qa/` artifacts produced during the trial.

---

## Daily prep (every day)

```sh
cd ~/sourcedeck-app
git checkout main
git pull origin main
npm test
npm run govcon:smoke
npm run troubleshooting:scan
npm run release:evidence
```

Expected results:

- `git pull` is fast-forward or no-op; if a merge is needed, **pause the trial** and address.
- `npm test` exits 0.
- `npm run govcon:smoke` reports 47/47 PASS.
- `npm run troubleshooting:scan` reports no fail / warn.
- `npm run release:evidence` reports `state: local_unsigned_dev`, `warnings: []`, `blockers: []`.

If any of the above fails, record the failure in the troubleshooting log as a Day-X critical / high finding and **do not proceed** with the day's scenarios until either:

1. The failure is fixed in a narrowly-scoped PR, OR
2. The failure is escalated to Tier 2.

## Day-specific run

After the daily prep passes:

```sh
# Open the app manually
# macOS: open Applications → SourceDeck (unsigned dev build; right-click → Open if first launch)

# Run the day's checklist from docs/trial/phase-25b-daily-test-checklist.md
# Record issues in the schema from docs/trial/phase-25b-troubleshooting-log-template.md
```

The operator works through the day's section of the daily checklist, then logs issues in the troubleshooting log structure. The log file lives locally only.

## Do-not commands (forbidden during the trial)

The operator must **not** run any of the following during the trial:

```sh
# ❌ Do not run a live SAM Sprint against a buyer's key.
# ❌ Do not deploy the website.
# ❌ Do not push to sourcedeck-site/main.
# ❌ Do not run any Stripe / payment / webhook command.
# ❌ Do not commit dist/, build/, out/, release/, reports/, .qa/, screenshots/, videos/, *.dmg, *.zip, *.pkg, *.cer, *.p12, *.mobileprovision, *.env*
# ❌ Do not commit Apple Developer ID, Apple API key, Apple notarization credentials.
# ❌ Do not run electron-builder --publish never with signing flags from this repo (signing is a future-phase concern).
# ❌ Do not echo / cat / less any .env file.
# ❌ Do not run `git push origin main` for any docs change without first opening a PR.
```

## Day 7 wrap-up commands

```sh
cd ~/sourcedeck-app
git checkout main
git pull origin main
npm test
npm run release:evidence
npm run govcon:smoke
npm run troubleshooting:scan
node scripts/release-check.js
```

After the gates run, the operator fills `docs/trial/phase-25b-go-no-go-scorecard.md` (offline, not committed) and selects exactly one decision. The completed scorecard stays local; the decision is communicated to the ARCG pilot tracker via the internal channel.

---

## Signature

This runner command checklist is the operator's local reference for the 7-day burn-in. No artifact produced during the trial is committed to the repo. Only the next-phase action (buyer-package work / fix PRs / Tier 2 escalation) follows from the Day 7 decision.
