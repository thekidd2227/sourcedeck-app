# SourceDeck v1 Release Candidate Known Limitations

## Release Status

SourceDeck v1 is locked as a release candidate for controlled demo use. It is not locked as a public signed/notarized macOS release.

## Known Limitations

### macOS Signing / Notarization

The local artifact is unsigned. Apple signing and notarization credentials are not configured in this environment.

Impact:

- Do not claim SourceDeck is signed.
- Do not claim SourceDeck is notarized.
- Do not publish a public signed macOS release until strict evidence passes.

Required resolution:

- Run signing/notarization in a credentialed release environment.
- Confirm strict signing readiness and strict release evidence both pass.

### watsonx Runtime

watsonx runtime evidence is present, but current outcome is `not_configured`, not `verified_ready`.

Impact:

- Do not claim watsonx is live.
- Do not claim IBM watsonx is included as a present-tense capability.
- Do not claim SourceDeck-managed watsonx is production-ready.

Safe language:

- watsonx-ready
- provider-governed AI workflow
- customer-provided AI credentials
- premium deployments may include managed watsonx after scoping and verified readiness

### Compliance / Certification Claims

No compliance certification claim is approved for this RC.

Do not claim:

- FedRAMP
- SOC 2 / SOC2
- CMMC
- HIPAA compliance
- HITRUST
- ISO 27001
- government compliant

Safe language:

- security-conscious workflow
- healthcare-sensitive deployment support
- customer environment and legal review required
- compliance scope must be verified separately

### Outcome Claims

SourceDeck does not guarantee business outcomes.

Do not claim:

- guaranteed contract
- guaranteed award
- guaranteed revenue
- guaranteed compliance
- guaranteed outreach success
- wins contracts

### Automation Boundaries

The RC is draft-first and human-approval-gated.

Limitations:

- No auto-send.
- No auto-submit.
- No autonomous proposal submission.
- No autonomous bid/no-bid decision.
- No autonomous pricing approval.
- No autonomous publishing or posting.
- No auto-repair by the troubleshooting agent.

### RC Freeze

After RC lock, only bug fixes, claims cleanup, docs, and evidence updates are allowed. New features require a new RC cycle.

