# Verification and threat model

Status: all implementation stages have passing checks. The suite contains 22 unit and 58 browser tests. Final discovery, replay, exceptional outcomes and scripted handoff were captured at `67c4000`; the [evidence index](../evidence/README.md) links every run. A fresh GitHub checkout passed installation and all checks without a provider key. The owner-requested UI simplification passed desktop/mobile visual review. Container egress verification and the 100/100 no-retry stability exercise passed at `bba5b6e`, with identical runtime source to the final capture.

The owner confirmed a successful manual notice handoff in development run `b6e31893-3921-487c-a5cb-2c3da9477e13`. A later visual canary exposed a CSP-related screenshot redaction defect, corrected with native masks and byte-level image invariance coverage. Pre-fix development images are not privacy evidence. Scripted provider and operator tests are not evidence of independent human or live-model execution.

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
| S03 | Service worker, WebSocket, download, file chooser and non-HTTP scheme | Service-worker requests blocked, unsupported channels rejected, downloads canceled with acceptance disabled |
| S04 | Target tries to contact operator API or model endpoint | Denied; operator/model credential unavailable to target |
| S05 | Missing/invalid credential, foreign Origin/Host, replayed operator epoch | Command rejected before touching the live session |
| S06 | Sensitive canaries in inputs, outputs, UI text, errors, provider content and manual typing | No canary in artifact, log, snapshot, filename, URL or exported image; model observation sanitized |
| S07 | Unknown screenshot region could contain data | Image omitted; useful structural failure snapshot retained |
| L01 | Cancel before action, during action, during provider request and during handoff | No new actions; truthful effect state and cleanup |
| L02 | Browser/worker death between intent and result | Incomplete/unknown effect reported; no automatic session recreation |
| L03 | Journal disk full, unwritable output, oversized evidence | New actions stop; clear safe failure without raw-data fallback |
| L04 | Parallel isolated local runs and repeat runs | No session, fixture, input or evidence cross-contamination; no orphan processes |

### Coverage locations

- D02-D05: `tests/browser/discovery.spec.ts` and `tests/unit/provider.test.ts`; fake provider responses test the real SDK adapter and interpreter boundaries. D01 is a separate live-provider evidence gate.
- C01-C05: `tests/unit/contracts.test.ts`, `tests/unit/catalog.test.ts` and the discovery compiler browser test.
- R01-R13: `tests/browser/cli.spec.ts`, `replay.spec.ts`, `surface.spec.ts` and `handoff.spec.ts`. The CLI subprocess denies provider fetches; `scripts/boundaries.mjs` checks transitive imports.
- H01-H06: `tests/unit/ownership.test.ts`, `tests/browser/handoff.spec.ts` and the full operator UI/API tests. The independent owner exercise supplements these scripted checks.
- S01-S07: discovery injection, native receiver probes, policy, operator API and privacy tests; `scripts/verify-containment.mjs` separately bypasses application interception to test worker networking. Its external receiver has a positive control.
- L01-L04: `tests/browser/lifecycle.spec.ts`, pending-provider cancellation, validation replay cancellation, late terminal-image polling, handoff expiry and operator shutdown tests; journal byte/event quotas in `tests/unit/evidence.test.ts`; the isolated-session stability harness. Browser loss is injected after the target accepted a search and before action completion is recorded. Journal loss uses a closed handle, not a claim of a real disk-full or host-power-loss experiment.

## 3. Threat boundaries and residual risks

| Threat | Control implemented in the local core | Limit or production prerequisite |
| --- | --- | --- |
| Malicious instructions in the UI/model response | Untrusted observation, strict decisions, no executable code, independent trusted policy | Prompts cannot guarantee immunity; policy must constrain consequential effects |
| Artifact tampering or malicious expression | Strict data-only schema, bounded parsing, semantic validation, digest-pinned review | Local filesystem owner can alter both artifact and registry; production needs separate signing/approval authority |
| Unsafe effect through an allowed-looking control | Reviewed effect map and postconditions; unknown effects denied | Incorrect vendor policy remains a risk; independent review and sandbox validation required |
| Browser egress or redirect escape | Exact allowlist, interception with redirects disabled, service workers blocked, unsupported channels denied | Native interception is a guardrail. The [contained profile](containment.md) independently verifies worker egress denial; real target support remains disabled |
| Tenant data crossover | Separate session/process/runtime directory in local tests | Production needs tenant-scoped identity, scheduling, network, storage and secret controls |
| Operator impersonation or race | Loopback credential, Origin/Host checks, serialized commands and epochs | Enterprise SSO/RBAC, durable leases and audited identities are not locally implemented |
| Data in evidence | Allowlisted event schema, reference values, safe structural snapshots and explicit export | Unknown visual content cannot be safely retained by generic regex masking |
| Provider data retention | Synthetic inputs and explicit request storage setting | Real customer data requires approved provider retention/residency configuration |
| Duplicate financial side effect | Block irreversible actions, record dispatch state, re-observe on timeout | UI-only exactly-once effects are unavailable; write support needs reconciliation and business authorization |
| Browser compromise or dependency compromise | Pinned dependencies, non-root contained browser, resource limits and no mounted credentials | Requires patch operations and isolated production workers; context separation is insufficient |

The verified local [containment profile](containment.md) separates browser/target networking from provider access. Chromium receives no model key, host workspace mount, Docker socket or operator secret. The provider client runs outside the browser's internal network. Expose only necessary loopback ports and validate commands crossing the control boundary. Internal container networking is one layer, not a claim that a container is equivalent to a microVM.

## 4. Evidence that can be trusted

The reviewed export contains:

```text
evidence/README.md
evidence/manifest.json
evidence/capture.json
evidence/artifacts/
evidence/runs/<run-id>/
evidence/screenshots/
evidence/walkthrough.webm
evidence/verification/
evidence/development/
```

The evidence README links each run explicitly. The manifest records source commit, runtime/browser/provider/model versions, fixture revision, commands, timestamps, file digests and what each run demonstrates. Provider response/request IDs and usage metadata establish a useful audit trail; they are not independent cryptographic proof of provider execution. Optional screenshots are inspected after sanitization. A recording is optional and may only use synthetic data.

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

The first stability exercise passed 100/100 at `c97f368`, with p50 1105.99 ms, p95 1559.19 ms and maximum 1694.88 ms. Runs alternated synthetic members at concurrency two on an Apple M5 Pro with 24 GiB memory. Full results are retained under `.local/stability/c1ffe9f2-2a76-4b61-aead-ee8536bd8e63/summary.json`; final export records the source revision and measurement limits.

The final stability exercise at `bba5b6e` passed 100/100, p50 1088.15 ms, p95 1153.73 ms, maximum 1545.56 ms. It uses approved revision 1, alternating two members at concurrency two. Revision 4 is separately exercised in the final capture. Runtime file hashes establish that later capture-harness, artifact and documentation commits did not alter execution code.

The release CI run `34635982748` passed all 22 unit tests and 57 browser tests, but its forbidden-action discovery test failed during browser startup with `APP_UNAVAILABLE`. That test imposed a 300 ms condition/navigation override even though it tests policy rejection, not timing. The three related decision-rejection cases now use the normal five-second surface bound. Runtime code and saved artifacts are unchanged; the failed run is retained, and no retries were added.

The goal/target correction adds caller-intent boundary, actual SDK payload, mobile console submission and rejected-goal tests. Failure diagnostics are checked through the public CLI. Historical exports include exact runtime source snapshots so their identity remains verifiable during implementation. The release gate is `corepack yarn verify:evidence --current`, which additionally rejects changed, missing or newly added runtime files; refresh live evidence before final sign-off.
