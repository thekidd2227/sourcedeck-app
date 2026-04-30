# SourceDeck Desktop — IBM Readiness Layer

This document explains the **optional** IBM integration layer added to
the SourceDeck Electron app (`thekidd2227/sourcedeck-app`).

> **Default behavior is unchanged.** With no env vars set, SourceDeck
> runs entirely offline using the `local` AI provider and the
> `local-store` (electron-store) storage provider. IBM watsonx.ai and
> IBM Cloud Object Storage are activated only when the relevant env
> vars are set.

---

## Provider selection

Set these env vars before launching the app (e.g. via the user's shell
or a launcher script):

```
AI_PROVIDER=watsonx              # default: local
WATSONX_API_KEY=...
WATSONX_PROJECT_ID=...           # or WATSONX_SPACE_ID
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL_ID=ibm/granite-13b-chat-v2

STORAGE_PROVIDER=ibm-cos         # default: local
IBM_COS_ENDPOINT=https://s3.us-south.cloud-object-storage.appdomain.cloud
IBM_COS_BUCKET=...
IBM_COS_REGION=us-south
IBM_COS_ACCESS_KEY_ID=...        # HMAC creds, not IAM API key
IBM_COS_SECRET_ACCESS_KEY=...
IBM_COS_SERVICE_INSTANCE_ID=...  # optional
```

If any required var is missing for the chosen provider, the in-app
**Settings → IBM mode (optional)** card surfaces the missing variable
names. Secrets are never echoed back to the renderer.

## Renderer surface (preload bridge)

`window.sd` adds these methods (on top of the existing storeKey /
getKey / deleteKey / storeGet / storeSet pair):

| Method                                   | Returns                                                         |
|------------------------------------------|-----------------------------------------------------------------|
| `aiProviderStatus()`                     | `{ provider, target, configured, missing[], modelId, … }`       |
| `storageProviderStatus()`                | `{ provider, target, configured, missing[], bucket?, region? }` |
| `aiGenerate({ prompt })`                 | `{ ok, provider, model_id, request_id, text, raw }` or error   |
| `storageTestPut(text)`                   | `{ ok, provider, key, size, hash, contentType, … }` or error   |
| `validateUpload({ name, size, mimeType, buffer? })` | `{ ok, normalized, ext, mime, size, hash }` or `{ ok:false, code }` |
| `contextGet()` / `contextSet(patch)`     | `{ tenantId, workspaceId, userId, role }`                       |
| `guardSensitiveAction(name, opts)`       | `{ allowed, error? }`                                           |
| `auditSummary()`                         | `{ count, cap, last: { eventType, status, timestamp } }`        |

None of these methods ever transmit raw API keys, bearer tokens, or
HMAC secrets to the renderer.

## Audit / governance log

Every state-changing IBM-readiness action emits an event:

- `AI_PROVIDER_SELECTED`, `AI_REQUEST_CREATED`, `AI_RESPONSE_RECEIVED`, `AI_REQUEST_FAILED`
- `STORAGE_OPERATION_STARTED`, `STORAGE_OPERATION_COMPLETED`, `STORAGE_OPERATION_FAILED`
- `CONTEXT_SET`, `SENSITIVE_ACTION_DENIED`, `CONFIG_INSPECTED`

Events persist in `electron-store` under `audit.events` with a 500-event
ring buffer and a 4 KB metadata cap. The redactor strips:

- forbidden keys: `apiKey`, `api_key`, `authorization`, `token`,
  `bearer`, `secret`, `password`, `WATSONX_API_KEY`,
  `IBM_COS_SECRET_ACCESS_KEY`, `IBM_COS_ACCESS_KEY_ID`, plus the
  document/prompt/file-body family.
- pattern matches: `Bearer …`, `sk_(live|test)_…`, `AKIA…`, JSON
  `"api_key": "…"`, long base64 blobs.

The renderer only ever sees `auditSummary()` output (counts + last
event metadata only — never event bodies).

## Role / tenant context

Defaults to `viewer` so sensitive actions are blocked unless the user
opts in. Roles ordered: `owner > admin > analyst > viewer`. The desktop
app is single-user, but this seam exists so a future cloud-sync or
shared-workspace mode can drop in a real OIDC mapping without
rewriting call sites.

## Upload validation

`validateUpload()` enforces:

- size cap (default 25 MB; configurable per call)
- MIME allowlist + extension allowlist
- MIME ↔ extension consistency check
- path-traversal blocking (`..`, `/`, `\`, `\0`)
- empty / null-byte filename rejection
- SHA-256 hashing when a `Buffer` is provided

## Tests

Run everything:

```
npm test
```

Includes the new `test/ibm-readiness.test.js` (34 cases) covering:

- config status snapshots never echo secret values
- audit redaction (denylist + pattern + size cap)
- audit ring-buffer bound
- audit summary is renderer-safe
- context default + role coercion + guard (hard + soft mode)
- upload validation edge cases (traversal, null byte, uppercase ext, oversized, mime/ext mismatch, hashing)
- AI factory provider selection
- AI watsonx adapter with stub fetch (IAM ok, HTTP error, IAM failure, empty response)
- storage local + ibm-cos disabled-adapter shape + key-validation gate
- factory status surfaces never include secret values

No live IBM credentials are exercised. Real watsonx / COS round-trip
verification requires environment configuration + a manual smoke test
once the user supplies creds (see the `Test AI provider` and
`Test storage` buttons inside Settings → IBM mode).

## Limitations / what this layer does NOT claim

- No SOC 2 / HIPAA / FedRAMP / CMMC certification.
- No watsonx.governance integration (just metadata-ready audit shape).
- No production SSO. The `context` model is a single-user stand-in.
- No live IBM round-trip verified in CI; mocked fetch only.
- The `release:check` codesign warning predates this change.
