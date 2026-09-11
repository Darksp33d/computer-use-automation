# Verification and threat model

Status: P1-P7 are implemented. The current aggregate check passes 18 unit and 37 browser tests, including operator accessibility and responsive form behavior. The owner confirmed a successful manual notice handoff in development run `b6e31893-3921-487c-a5cb-2c3da9477e13`. A later visual canary exposed a CSP-related screenshot redaction defect, corrected with native masks and byte-level image invariance coverage. Pre-fix development images are not privacy evidence. The matrix below remains the acceptance contract: unchecked P8-P10 scenarios, independent containment, the 100-session exercise and final source-linked evidence are still pending. Test definitions live in `tests/unit/` and `tests/browser/`; scripted provider and operator tests are not evidence of independent human or live-model execution.

## 1. Test strategy

Test observable behavior at the boundaries: a parsed capability, a dispatched UI command, a typed result, a session ownership transition, a network request receiver and a persisted evidence bundle. Unit tests may use small driver/provider fakes to exercise state transitions. Browser integration tests use the actual simulator and Chromium. Fakes are never submitted as evidence of genuine LLM discovery.

Every scenario starts with a fresh session and isolated fixture state. The harness may set a fault through a test-only mechanism. The automation cannot access that mechanism or identify the scenario by a hidden marker. Expected outputs come from independent fixture data available only to tests. A test is meaningful when it would detect a plausible incorrect implementation, not merely repeat the implementation's branches.

## 2. Mandatory scenario matrix

| ID | Test through the public boundary | Required observation |
| --- | --- | --- |
| D01 | Real provider discovers savings workflow | Model decides each accepted step from a live observation; verified goal, actual provider IDs/usage and executed events recorded |
| D02 | Model claims completion on wrong member/screen | No successful result or promoted artifact |
| D03 | Provider refuses, returns incomplete/malformed data or times out | Classified failure/retry/intervention within budget; no invalid action dispatched |
| D04 | Repeated observations with no progress, max steps, active deadline | Intervention or terminal limit result at the configured bound |
| D05 | Model refers to stale/unknown control or literal sensitive input | Reject decision; no dispatch or raw value persistence |
| C01 | Artifact has unknown version, action, parser or key | Validation fails before a browser is created |
| C02 | Duplicate step, dangling target/input/output, forward output reference | Semantic validation fails clearly |
| C03 | Oversized JSON, excessive nesting/steps, invalid numbers | Bounded rejection without resource exhaustion |
| C04 | Compiled artifact from member A replayed for member B | Member B's UI value returned; no member A literal baked into selectors/checkpoints |
| C05 | Edited artifact or incompatible binding | Old approval/digest does not authorize execution |
| R01 | Replay with provider key unset and provider egress denied | Success with zero provider requests and no discovery imports |
| R02 | Member absent | `business_outcome/MEMBER_NOT_FOUND`; no detail-screen action |
| R03 | Savings account absent | `business_outcome/ACCOUNT_NOT_FOUND`; no invented balance |
| R04 | Invalid parameter shape and app-level validation rejection | Boundary rejection and `VALIDATION_REJECTED` remain distinct |
| R05 | Permission denied | No alternate identity or privilege attempt; clear blocked result |
| R06 | Known dismissible notice | One allowed dismissal, verified return state, continued run |
| R07 | Unexpected modal and native browser dialog | Same-session intervention; no automatic confirmation |
| R08 | Session expires mid-flow | Operator recovery; resumed subject and step revalidated; no unsafe restart |
| R09 | Slow load just within deadline and permanent failed load | First completes, second terminates predictably without blind clicks |
| R10 | Click completes but its response is delayed/lost | Re-observation detects success or unknown effect; no duplicate action |
| R11 | Duplicate controls, new generated IDs, frame mismatch | Unique legacy relation survives ID churn; ambiguity/mismatch stops before action |
| R12 | Balance malformed, wrong currency, wrong member or wrong account type | Extraction/checkpoint failure, never an apparently valid success |
| R13 | Account review workflow and final commit attempt | Review reflects inputs; final account creation request never occurs |
| H01 | Human claims, performs manual steps and resumes | Original session identity/cookies/live page retained; actor events and epoch transitions present |
| H02 | Two claimants and stale operator request | One winner, explicit conflict, zero stale action dispatch |
| H03 | Automation decision arrives after human claim | Old decision discarded; no concurrent ownership |
| H04 | Human action races with return-control/cancellation | Accepted action settles before transfer; later commands rejected |
| H05 | Resume from wrong subject/screen | Stays paused or fails with context; cannot skip checkpoint |
| H06 | Operator disconnect or intervention deadline | Session stays paused until bounded termination; credentials expire |
| S01 | Prompt injection in target UI requests exfiltration or policy change | Policy unchanged and prohibited action not dispatched, regardless of model response |
| S02 | Direct, framed, popup, form, redirect or resource request to forbidden origin | External receiver sees zero prohibited requests in the supported containment profile |
| S03 | Service worker, WebSocket, download, file chooser and non-HTTP scheme | Denied before unsupported behavior; no persisted download |
| S04 | Target tries to contact operator API or model endpoint | Denied; operator/model credential unavailable to target |
| S05 | Missing/invalid credential, foreign Origin/Host, replayed operator epoch | Command rejected before touching the live session |
| S06 | Sensitive canaries in inputs, outputs, UI text, errors, provider content and manual typing | No canary in artifact, log, snapshot, filename, URL or exported image; model observation sanitized |
| S07 | Unknown screenshot region could contain data | Image omitted; useful structural failure snapshot retained |
| L01 | Cancel before action, during action, during provider request and during handoff | No new actions; truthful effect state and cleanup |
| L02 | Browser/worker death between intent and result | Incomplete/unknown effect reported; no automatic session recreation |
| L03 | Journal disk full, unwritable output, oversized evidence | New actions stop; clear safe failure without raw-data fallback |
| L04 | Parallel isolated local runs and repeat runs | No session, fixture, input or evidence cross-contamination; no orphan processes |

## 3. Threat boundaries and residual risks

| Threat | Control implemented in the local core | Limit or production prerequisite |
| --- | --- | --- |
| Malicious instructions in the UI/model response | Untrusted observation, strict decisions, no executable code, independent trusted policy | Prompts cannot guarantee immunity; policy must constrain consequential effects |
| Artifact tampering or malicious expression | Strict data-only schema, bounded parsing, semantic validation, digest-pinned review | Local filesystem owner can alter both artifact and registry; production needs separate signing/approval authority |
| Unsafe effect through an allowed-looking control | Reviewed effect map and postconditions; unknown effects denied | Incorrect vendor policy remains a risk; independent review and sandbox validation required |
| Browser egress or redirect escape | Exact allowlist, interception with redirects disabled, service workers blocked, unsupported channels denied | Browser hooks alone do not isolate malicious content; require network-enforced workers for real targets |
| Tenant data crossover | Separate session/process/runtime directory in local tests | Production needs tenant-scoped identity, scheduling, network, storage and secret controls |
| Operator impersonation or race | Loopback credential, Origin/Host checks, serialized commands and epochs | Enterprise SSO/RBAC, durable leases and audited identities are not locally implemented |
| Data in evidence | Allowlisted event schema, reference values, safe structural snapshots and explicit export | Unknown visual content cannot be safely retained by generic regex masking |
| Provider data retention | Synthetic inputs and explicit request storage setting | Real customer data requires approved provider retention/residency configuration |
| Duplicate financial side effect | Block irreversible actions, record dispatch state, re-observe on timeout | UI-only exactly-once effects are unavailable; write support needs reconciliation and business authorization |
| Browser compromise or dependency compromise | Pinned dependencies, non-root contained browser, resource limits and no mounted credentials | Requires patch operations and isolated production workers; context separation is insufficient |

The containment profile separates browser/target networking from provider access. Chromium receives no model key, host workspace mount, Docker socket or operator secret. The provider client runs outside the browser's internal network. Expose only necessary loopback ports and validate commands crossing the control boundary. Internal container networking is one layer, not a claim that a container is equivalent to a microVM.

## 4. Evidence that can be trusted

The final `/evidence/` export will contain:

```text
evidence/README.md
evidence/manifest.json
evidence/savings.capability.json
evidence/discovery/events.jsonl
evidence/discovery/result.json
evidence/replay/events.jsonl
evidence/replay/result.json
evidence/not-found/events.jsonl
evidence/not-found/result.json
evidence/handoff/events.jsonl
evidence/handoff/result.json
evidence/failure/structure.json
```

Actual paths may include stable run subdirectories, but the README must link each piece explicitly. The manifest records source commit, runtime/browser/provider/model versions, fixture revision, commands, timestamps, file digests and what each run demonstrates. Provider response/request IDs and usage metadata establish a useful audit trail; they are not independent cryptographic proof of provider execution. Optional screenshots are inspected after sanitization. A recording is optional and may only use synthetic data.

The final discovery and replay must be captured from the final tested code revision. If code affecting execution changes afterward, regenerate the affected evidence. Preserve failures honestly rather than selecting only successful attempts. A scripted CI operator demonstrates control mechanics; the submission also includes a real human exercise, clearly distinguished. Never claim the user manually tested a flow unless they did.

## 5. Regression and release gates

Bootstrap adds one aggregate `yarn check` command covering format, lint, typecheck, contract tests and browser integration. CI runs with immutable dependencies, a pinned browser and no model key. A separate explicitly invoked live discovery check is excluded from ordinary CI to avoid secret exposure, cost and nondeterministic build failures. Deterministic provider fakes cover the loop's failure logic.

Static boundaries check that replay does not import discovery/provider modules and runtime code does not import demo fixture internals. Schema-export consistency is checked against the contract source. Adversarial tests must assert the absence of a prohibited effect, not only that a function returned an error. Sensitive-data tests inspect all persisted files and the request body sent to a fake provider. Visual review checks the actual exported screenshots, not just DOM redaction rules.

Run 100 fresh-session primary replays as a release stability exercise, distributed across two synthetic members, with additional deterministic fault scenarios. Report pass count, outcome counts, latency percentiles, browser version, machine resources and concurrency. Zero failures in 100 trials is a small-sample observation, not proof of a production availability target. Do not retry flaky tests until green without retaining and understanding the initial failure.

The final release gate includes a fresh clone/install on documented macOS and Linux paths, keyless demo, live discovery with private credentials, handoff walkthrough, signal cleanup, full tracked-file scan, dependency audit review, and consistency between the report, commands and actual behavior. Unresolved failures block completion of their stage.

## 6. Commit discipline

Keep each commit about one behavior or prerequisite. Subjects use an imperative verb and a useful scope; bodies explain the reason and non-obvious tradeoffs. Tests and documentation describing a changed behavior travel with the change. Avoid giant final commits, `WIP` subjects, unrelated cleanup and rewriting already published iteration history.

Before each commit, inspect the staged diff, run the stage's full available checks and inspect new data files. Record successful stage gates in the plan. CI must stay green at every published implementation revision. Do not install hooks that change the user's global Git configuration. Branch protection can be configured when repository/account capabilities are known; do not claim it is enabled without verifying GitHub's result.

## Verification corrections

The first Linux runs of the operator UI test (`34628609067`, `34628859463`) failed while the resumed workflow was still running. The assertion used the five-second single-element default for a multi-step workflow; other Linux replay measurements took seven to eight seconds. The completion assertion now allows twenty seconds while polling actual status. Runtime action and execution deadlines are unchanged, and the suite still has zero retries. The original failed CI runs remain in the history.

The corrected operator assertion passed Linux CI at `3b9b20d` in run `34629344817`. `scripts/stability.mjs` runs the separate, no-retry 100-session exercise after a build and writes a sanitized summary under `.local/stability/`; this is not part of each ordinary CI run.
