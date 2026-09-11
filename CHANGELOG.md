# Change log

This log records accepted milestones and material changes. PLAN.md is the completion ledger. A pending item is not a delivered feature.

## 2026-09-11

### Verified

- P1: Pinned Node/Yarn/TypeScript/Playwright tooling, CI and runtime readiness checks. Reviewed Dribbble references before building interfaces.
- P2: Strict versioned capability schema, input/output validation and exclusive ownership state machine.
- P3: Synthetic legacy banking simulator with iframe navigation, generated field IDs and controlled exceptional scenarios.
- P4: Policy-checked browser driver, request restrictions, safe observations and durable sanitized journals.
- P5: Model-free replay with checkpoint verification, typed outputs, business outcomes, one-shot notice recovery, cancellation and structural failure evidence. Verified 17 unit tests and 18 browser tests before commit.

- P6: Genuine GPT-6 Astra discovery and execution-derived compilation for both savings and account review, each replayed with different synthetic inputs. Verified 17 unit and 22 browser tests. Added request, output-token, no-progress and estimated cost admission bounds. Development evidence was retained locally for the later P10 export.

- P7: React/Vite operator console, authenticated commands, same-session manual controls, exclusive claim, verified resume, intervention expiry and exact-byte capability approval. Verified 18 unit and 30 browser tests, including axe accessibility checks. A browser-driven development exercise completed genuine discovery, fresh replay, contract review and approval. The owner separately confirmed successful manual notice handoff in run `b6e31893-3921-487c-a5cb-2c3da9477e13`. The control layer was also checked independently before commit: 18 unit and 28 browser tests.

### Corrective verification

- A visual canary check found that screenshot-only CSS did not hide sensitive fields under the target’s Content Security Policy. Replaced it with native screenshot masks. Prior development screenshots and provider runs do not establish image-redaction correctness and are excluded from final privacy evidence. Only synthetic fixture records were used. New regression coverage compares complete screenshot bytes across different private review values.

### Product identity

- Renamed Relay to Groove across the console, launch message and product documentation. The owner chose Groove after a brief Praxis Loom iteration. Added an original concentric-path G mark. Kept repository links, capability revisions and historical run identifiers stable.

### Decisions

- Selected the owner-requested GPT-6 Astra model for discovery, starting at low reasoning effort. Provider availability and full workflow completion are separate gates.
- Revised the operator stack to React, TypeScript and Vite following the owner's review. Live state, stable forms and ownership transitions justify component state management. CSS remains the styling layer. The legacy target remains HTML and CSS by design. See D09 for alternatives and security boundaries.
- Kept capability expressions limited to the two implemented workflows. See D10 for the excluded speculative features.

### Runtime and containment

- P8: Added agent-invocable replay with bounded stdin, approved capability lookup, one JSON result, deliberate exit codes and opt-in sensitive stdout. Keyless subprocess tests cover success, redaction, business outcomes and invalid input. Expanded tests reject wrong currency/account type, distinguish application validation and prove one request after an uncertain navigation. The no-retry stability exercise passed 100/100 fresh sessions at concurrency two: p50 1.11 s, p95 1.56 s, 100 searches and zero account commits on the documented local machine.
- P9: Native probes cover eleven unsupported browser channels; unrecognized image content causes omission. The non-root container replay and independent egress probe passed locally and in Linux CI. Provider calls now honor the remaining active deadline and distinguish invalid responses from transport failure. Verified 22 unit and 56 browser tests, including cancellation, browser loss after dispatch, unavailable journals, evidence quotas and prompt injection. Replay import boundaries and provider-disabled subprocess checks are part of the aggregate gate.

### Evidence and documentation review

- Preserved the model-comparison rationale and fallback evaluation order, checked the cited sources, and corrected an Opus 4.8 score previously attributed to Opus 5. Published benchmarks remain separate from local completion evidence; no cross-provider fallback is implemented.

- Retained the development console's approved sub-account revision 2 with its exact artifact bytes and original discovery/replay identifiers. It remains a development artifact; final source-linked discovery is captured separately.

- Final-source discovery completed both workflows at `bba5b6e`, each followed by different-input validation and explicit contract review. Retained these exact approved revision-3 artifacts. The capture review found screenshots taken before the periodic image refresh; the harness now waits for a new image request and a decoded image before saving screenshots. An intermediate capture verification failed under the console CSP after its discovery succeeded; those run records are retained separately.

### Lifecycle review

- Preserved the final masked snapshot when an earlier image request finishes late. Propagated cancellation into discovery's validation replay in both the operator and CLI. A canceled validation cannot expose output or become approvable. Verified 22 unit and 58 browser tests, including deterministic races at both boundaries.

### Assignment input and diagnostics correction

- Added explicit public goal and registered target inputs to console discovery and the bounded JSON CLI. Goals reach the provider; private parameters remain separate. Unsupported requests stop with `GOAL_UNSUPPORTED` and cannot become approved capabilities.
- Added safe expected/observed failure diagnostics to caller results and the console. Added provider-payload, mobile-form, rejected-input and failure-result coverage. Historical evidence now includes its exact source snapshot; `verify:evidence --current` additionally requires current runtime identity before release. Fresh live capture subsequently passed at `c7d617c`. Artifact review caught the expanded prompt still labeled as version 1; new discoveries use version 2 and replay retains compatibility with both versions. The first corrected-goal capture was stopped before approval and preserved.

### Earlier release evidence

- P10: Added an explicit capture harness for genuine console discovery, artifact review, keyless replay and exceptional outcomes. Captures stay private until reviewed. Simplified page titles, empty states, dialogs, activity and inspector copy following the owner’s review. Removed slogans and duplicate explanations, preserved contextual handoff instructions, and made the closed-session placeholder compact. Desktop/mobile visual inspection and the full automated suite pass. The final capture at `67c4000` passed both genuine discoveries, different-input validation, approval, keyless replay, business/failure cases and scripted same-session handoff. Reviewed revision 4 artifacts, thirteen inspected screenshots, the continuous recording and sanitized run histories are exported under `evidence/`.

- Added a release evidence verifier that checks all exported file digests, runtime source identity, journal order and outcomes, provider/replay separation, artifact copies and validation links. Preserved the actual owner development handoff, the first discovery failure and both earlier capture attempts with their limitations. Fresh-checkout verification passes 22 unit and 58 browser tests; the final stability exercise passed 100/100 without retries.

- Completed P10 release documentation, the seven-section report and the requirement ledger. The delivered GitHub checkout verifies all evidence, replays revision 4 without a key, starts the console and exits cleanly on SIGINT with its port closed. The final tracked-file scan found no provider secret, private workstation path, broken Markdown file link or em dash.

- Corrected a test-only 300 ms browser startup override exposed by Linux release CI. Decision-rejection tests use the normal five-second surface bound; production deadlines and policy are unchanged. The failed CI run `34635982748` is preserved.

- Reopened assignment-complete sign-off after a fresh PDF/source audit identified that Section 3.1 requires goal and target inputs, while the delivered CLI/console only select predefined task contracts. Recorded requirement-by-requirement findings and the diagnostic/result caveat in `docs/assignment-audit.md`. Existing passing workflow evidence remains valid within its stated scope.

### Final post-audit verification

- Closed the assignment audit with explicit goal/target discovery, safe expected/observed failures and prompt version 2 provenance. Two genuine console discoveries produced reviewed revision 5 capabilities. Their fresh validations, provider-free replays, unsupported-goal rejection, business/failure cases and live-session handoff all pass. A separate genuine JSON-stdin CLI goal also discovers and replays with another member.
- Verified 23 unit and 62 browser tests in the working repository, a clean GitHub checkout and Linux CI `34651378928`. The post-audit stability sample passes 100/100 at concurrency two with zero account commits; container egress and replay checks pass. Keyless startup and SIGINT cleanup pass.
- Refreshed the evidence source snapshot, journals, 17 inspected screenshots and continuous recording. Reconciled README, REPORT, plan, decisions and the requirement audit; added a five-minute presentation walkthrough with concrete answers to architecture and scope questions. Publication remains the owner's decision.
