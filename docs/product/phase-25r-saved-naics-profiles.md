# Phase 25R — Saved NAICS Profiles

**Date:** 2026-06-15
**Repo:** `thekidd2227/sourcedeck-app`

---

## 1. Mission

Let buyers reuse curated NAICS code sets across SAM.gov searches. Save once as a named profile (e.g. "Facilities") and apply on demand from the Find Opportunities filter row.

## 2. Profile shape

```ts
{
  id:           string,    // "naics-<ts>-<rand>"
  name:         string,    // e.g. "Facilities"
  codes:        string[],  // ["561720", "561210"]
  descriptions: string[],  // mirrors codes (best-effort from seed table)
  isDefault:    boolean,
  createdAt:    string,    // ISO-8601
  updatedAt:    string     // ISO-8601
}
```

Only one profile can be `isDefault=true` at a time. `naicsFinderSaveProfile` and `naicsSetDefault` enforce this invariant by sweeping the others to `false` first.

## 3. Storage

- electron-store key: `govcon.naicsProfiles` (via `window.sd.storeGet` / `storeSet`).
- localStorage fallback: `sd.govcon.naicsProfiles.v1`.
- Local-only. No external upload. No API key required.

## 4. Public surface

| Function                       | Behavior                                                                              |
|--------------------------------|---------------------------------------------------------------------------------------|
| `naicsFinderSaveProfile()`     | Saves the current Finder selection under the name in the modal's name input. Honors the default checkbox. Updates an existing profile if the name matches. |
| `naicsListProfiles()`          | Returns a defensive copy of the profile array.                                        |
| `naicsApplyProfile(id)`        | Writes the profile's codes (comma-separated) into `#gc-tab-f-naics`.                  |
| `naicsSetDefault(id)`          | Marks one profile as default; sweeps the rest to `false`.                             |
| `naicsDeleteProfile(id)`       | Removes a profile by id.                                                              |
| `naicsRenderProfileSelector()` | Repopulates the `#gc-tab-f-naics-profile` dropdown on the Find Opportunities tab.     |

## 5. UI surfaces

- **Find Opportunities** carries the `#gc-tab-f-naics-profile` dropdown. Selecting a profile calls `naicsApplyProfile(profileId)` to write the codes into the NAICS field.
- **NAICS Finder modal** carries the profile-name input + default checkbox + Save button.

## 6. Boundaries

- Local-only.
- No external upload, no API key, no government portal call.
- SourceDeck uses NAICS for search/filter support only — not legal classification advice.

## 7. Tests

- `test/phase-25r-saved-naics-profiles.test.js` — sandbox simulation: save profile, persist to electron-store + localStorage, apply profile, set default, delete profile, assert default-uniqueness.

`npm test` → 78 PASS suites, 0 FAIL.
