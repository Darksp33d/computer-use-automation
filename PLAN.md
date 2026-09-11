# Implementation plan

Status: all implementation stages and the final assignment audit pass within the documented scope. See [the audit](docs/assignment-audit.md). Checkboxes represent evidence-backed completion, not intent.

## 1. What we are building

A computer-use system that learns a task by operating a real application, saves what worked as a typed capability, and executes that capability later without a model deciding the steps.

The demonstration uses a local, fictional banking application with synthetic data. An evaluator can choose a goal such as "Find this member's savings account and return its available balance." The model inspects the live screen, chooses controls, and operates the application. The resulting capability accepts a different member ID on replay and returns typed data or a named business outcome. When the application presents an unresolved interruption, an operator can take control of the same browser session, resolve it, and explicitly return control.

The first delivery is this plan and a private GitHub repository. The implementation sequence below is the working checklist for subsequent development. The repository becomes public only when the owner requests that change. The assignment's submission instructions are requirements to prepare for, not authorization to email the company.

### The quality bar

Build every required part of the end-to-end chain. Make failures observable and safe. Prove important claims with executable tests and real run evidence. Keep abstractions small enough to explain during an interview. Document uncertainty instead of claiming universal safety, zero possible regressions, or unmeasured scale.

Millions of concurrent users and millions of active UI sessions are different capacity requirements. The scale design addresses both explicitly. The assignment implements a tested execution core; a deployment serving millions requires the isolation, scheduling, operational controls, and measurements in [the scale plan](docs/scale.md). Those are release prerequisites for that deployment, not capabilities the local submission can claim.

## 2. Scope and acceptance map

| Assignment requirement | Concrete implementation | Proof required before completion |
| --- | --- | --- |
| 3.1 Goal-driven loop | Goal, target binding, named runtime inputs, screenshot/control observation, bounded model decisions, real UI actions | Genuine provider-backed discovery against the running simulator; no predefined action sequence supplied to the model |
| 3.2 Capability artifact | Strict versioned JSON with inputs, outputs, targets, ordered steps, preconditions, postconditions, outcomes, recovery rules, provenance | Schema rejection tests, reviewable saved artifact, replay using different inputs |
| 3.3 Deterministic replay | Model-free interpreter, stable targeting, bounded waits, explicit outcome taxonomy, verified output extraction | Replay with provider access disabled; business, recovery, and hard-failure tests |
| 3.4 Guardrails | Trusted application policy, action classification, origin/route/method checks, restricted commands, sensitive-data handling | Denied actions never dispatch; adversarial egress and secret-canary tests |
| 3.5 Evidence | Typed event journal plus sanitized structural failure snapshot; optional safely masked screenshot | Discovery and replay logs, debuggable failure bundle, no sensitive canaries in persisted data |
| 3.6 Human handoff | Intervention inbox, exclusive control ownership, manual actions in the same session, guarded resume | Real operator exercise and deterministic race tests; human events retain session identity |
| 3.7 Heterogeneity and scale | Driver boundary, application bindings, immutable capability revision, tenant specialization design | Legacy iframe/table demonstration; written desktop, isolation, reuse, drift, and capacity design |
| Required deliverables | README, REPORT with seven exact headings, evidence directory | Clean-checkout walkthrough and release audit |

The full test mapping is in [verification](docs/verification.md). The short evaluator narrative is in [REPORT.md](REPORT.md). The implementation contract is in [design](docs/design.md).

## 3. Demonstration use cases

### Primary capability: read a savings balance

1. Open the simulator's member search screen.
2. Enter a supplied synthetic member ID.
3. Submit the search and inspect its result.
4. Open the matching member, then their savings account.
5. Check that the displayed account belongs to the requested member and has the requested account type.
6. Read available balance and currency from the UI, parse them deterministically, and return them to the caller.

Inputs: `memberId`, a constrained string. Outputs: `availableBalanceMinor`, an integer in currency minor units; `currency`, an enum initially restricted to USD; `accountType`, the literal `savings`. Member identity is checked in memory and is not echoed into persistent evidence. The same capability must work for two IDs with different balances. An absent member and a member without a savings account are separate legitimate outcomes.

### Secondary capability: prepare a sub-account for review

Search for a member, open the new sub-account form, fill account type and nickname, and reach the review screen. Verify the review matches the inputs. Stop before the final "Open account" action. This exercises parameterized forms, validation errors, a review checkpoint, and a concrete irreversible boundary. It is part of the core demonstration suite, built after the primary path passes.

### Handoff case

A replay encounters an unexpected application interstitial requiring an operator acknowledgment. The run pauses. The operator claims the intervention, sees the live session, dismisses the interstitial through the operator controls, and returns control. The engine checks its declared resume condition before continuing. A separate session-expiry scenario demonstrates that authentication recovery cannot silently skip previously required steps.

### Runtime scenarios

The simulator supports normal behavior, member absent, account absent, validation rejected, permission denied, known dismissible notice, unexpected modal, session expired, bounded slow load, persistent application error, duplicate matching controls, changed frame/control binding, and a click whose visible completion is delayed. Fault selection belongs to the test/demo harness, never to model observations or automation decision logic.

The target is deliberately legacy-like: server-rendered forms, an iframe workspace, nested tables, no test IDs, some controls with adjacent text instead of associated labels, and regenerated element IDs. It must remain usable by a person. Success must come from UI interaction; discovery and replay may not call fixture data/reset/fault endpoints or read application source, hidden state, or database contents.

## 4. Chosen stack

| Choice | Specific job and reason |
| --- | --- |
| TypeScript, strict mode | One language for contracts, browser integration, CLI, and the small operator client; discriminated unions make invalid action/result combinations visible during development |
| Node.js 24 LTS | Supported runtime for Playwright and the provider SDK, native cancellation/HTTP/test facilities, straightforward macOS and Linux setup |
| Yarn 4 | Lockfile-based reproducibility and alignment with workspace tooling; use `node-modules` linking for predictable browser tooling |
| Playwright with pinned Chromium | Real input, frame-aware locators, actionability checks, browser lifecycle, dialogs, and screenshots in one maintained dependency |
| Zod 4 | Validate untrusted artifact, model, and operator inputs; derive TypeScript types and export the supported JSON Schema representation from one source |
| OpenAI Responses API and official SDK | One discovery-only model adapter, strict structured decisions, image observations, bounded requests and usage evidence |
| `gpt-6-astra` discovery model, `reasoning.effort` starting at `low` | Owner's selection, supported by published grounding/workflow evaluations and actual P6 completion at low effort. No dated snapshot exists yet, so every discovery run records the exact model string, response IDs and token usage in provenance and evidence. D05 records a fallback evaluation order and triggers; no automatic fallback is implemented |
| React, TypeScript and Vite | Stateful operator workspace with live sessions, stable forms, ownership transitions and reusable accessible controls; static assets served by the existing server |
| Native Node HTTP and legacy HTML/CSS | Bounded local control API and intentionally older banking simulator; server enforces authentication and policy |
| Node test runner and Playwright Test | Public contract/state-machine tests plus real-browser integration and operator-flow tests; each covers a different boundary |
| JSON artifacts and JSONL evidence | Human-reviewable files and simple local operation; atomic artifact writes and serialized bounded evidence writes |
| Docker Compose containment profile | Reproducible Linux/browser environment and an internal browser/target network for the isolation tests; native setup remains available for the trusted local fixture |

Production quality comes from correct boundaries and verification, not a long dependency list. [Decisions and primary sources](docs/decisions.md) explain alternatives, limitations, and the evidence needed to keep these choices. Exact package versions and container digests are selected and locked during bootstrap after compatibility and security checks. No floating `latest` versions in the runnable submission.

## 5. Architecture at a glance

```mermaid
flowchart LR
  C[CLI or calling agent] --> R[Run coordinator]
  R --> D[Discovery loop]
  D --> M[Model adapter]
  D --> X[Action executor]
  X --> P[Policy and session ownership]
  P --> S[Surface driver]
  S <--> B[Live browser and legacy simulator]
  D --> K[Capability compiler]
  K --> A[Versioned artifact]
  A --> E[Replay interpreter]
  R --> E
  E --> X
  R <--> H[Intervention controller]
  O[Operator console] <--> H
  H --> X
  R --> J[Sanitized evidence journal]
```

The replay interpreter cannot import the model adapter. Every automation or operator command goes through the same policy and ownership boundary. A browser session has exactly one owner at a time. The application binding owns knowledge of controls, allowed effects, and error markers; it does not prescribe the workflow order. The model discovers that order through observations.

Source layout:

```text
src/contracts/       Artifact, decision, result, event and intervention schemas
src/core/            Replay, action execution, policy, ownership and artifact compiler
src/discovery/       Observe/decide/act orchestration and provider adapter
src/surfaces/        Surface interface and Playwright implementation
src/applications/    Legacy simulator binding and trusted policy
src/evidence/        Event serialization, sanitization and atomic file storage
src/operator/        Local intervention API
ui/                  React operator workspace, hooks and typed HTTP service
src/cli/             Arguments, lifecycle, output and exit codes
demo/                Fictional banking UI, synthetic fixtures and fault harness
tests/               Contract, integration, browser and adversarial tests
evidence/            Reviewed genuine discovery/replay/handoff examples
docs/                Detailed design, decisions, verification and scaling
```

## 6. Implementation sequence and commit gates

Every implementation commit contains the tests needed for the behavior it introduces. Do not commit a failing intermediate refactor and promise to fix it in the next commit. Keep the last passing path runnable. If a check fails, repair the change or reduce its scope before committing. Tests reduce regression risk; they cannot prove that no possible regression exists.

| Stage | Intended commit subject | Work and exit gate |
| --- | --- | --- |
| P0 | `docs: define implementation plan and acceptance criteria` | Read the full assignment, research key decisions, write this baseline, check links/headings, create private repository |
| P1 | `chore: establish reproducible tooling and quality checks` | Pin runtime/packages/browser, strict TypeScript, lint/format, test scripts, CI, safe ignore rules and doctor command; clean install and all available checks pass |
| P2 | `feat: define capability and execution contracts` | Implement v1 schemas, bounded parsing, semantic validation, result taxonomy, event formats and handoff transitions; malformed references, incompatible versions and invalid state transitions fail safely |
| P3 | `feat: add legacy banking simulator and scenario harness` | Primary UI, review flow and fault scenarios with synthetic data; a person and a browser test can complete both flows; simulator state never enters the runtime through a shortcut |
| P4 | `feat: add policy-checked browser sessions` | Observe/resolve/act, legacy targeting, ownership gate, redacted observations, request controls, sanitized failure snapshots and lifecycle cleanup; real browser and policy tests pass |
| P5 | `feat: replay capabilities with verified outcomes` | Model-free interpreter, postconditions, extraction, business outcomes, bounded recovery and typed failures; a clearly labeled test artifact replays for different inputs without model access |
| P6 | `feat: discover and compile reusable UI capabilities` | Genuine structured model decisions, budgets, param references, compiler and provenance; at least one actual successful model run compiles and replays before moving on |
| P7 | `feat: add exclusive live-session operator handoff` | Intervention inbox, authenticated local commands, same-session human input, event capture and verified resume; race, stale-control and manual exercise pass |
| P8 | `feat: demonstrate review workflows and runtime recovery` | Complete secondary capability, entire scenario matrix and read-only repeated stability exercise; no blind retry or premature success |
| P9 | `test: verify containment and failure boundaries` | Container isolation profile, cross-origin probes, prompt injection, sensitive-data canaries, cancellation, crash and resource tests; document verified platform limits |
| P10 | `docs: publish reproducible discovery and replay evidence` | Capture final-commit discovery/replay/exception/handoff evidence; finish README and 1-3 page REPORT; independent clean checkout and all release gates pass |

Stage order is dependency-driven. If early research or the P4/P6 experiments invalidate a design choice, add a narrow decision entry and fix the earlier stage before extending the system. Do not disguise a scripted run as discovery to get past P6. Provider credentials are a prerequisite for that stage, not for planning or deterministic development.

### Progress ledger

- [x] Read all ten assignment pages and verify the document layout.
- [x] Map every core requirement and required deliverable.
- [x] Research browser semantics, model contracts, data handling, runtime and isolation choices.
- [x] Write the architecture, test strategy, threat model and capacity design.
- [x] P0: Verify the planning baseline and establish the private repository at `Darksp33d/computer-use-automation`.
- [x] P1: Reproducible tooling. Immutable Yarn install, TypeScript checks, formatter/linter, doctor tests and pinned Chromium setup passed locally. CI is configured; remote execution is verified separately.
- [x] P2: Contracts and state machine. Twelve unit tests pass, including invalid artifacts, typed parameters, money parsing and ownership races. Generated schema consistency passes.
- [x] P3: Simulator and scenarios. Three real Chromium flow tests and a visual inspection pass. Fault fixtures are available for the runtime suite; no account commit occurs in the tested flows.
- [x] P4: Policy and surface driver. Seventeen unit tests and six browser tests pass. The driver resolves legacy controls without generated IDs, rejects ambiguous targets and frame drift, and journals only allowlisted event fields. Broader adversarial containment checks remain in P9.
- [x] P5: Deterministic replay. Verified 17 unit and 18 browser tests, including two parameter sets, typed outcomes, bounded notice recovery, delayed navigation, safe output persistence and the account-review boundary. Artifacts in these tests are explicitly handwritten fixtures; genuine discovery is P6.
- [x] P6: Genuine discovery and compiler. GPT-6 Astra at low effort completed both savings and review workflows; each generated artifact replayed in a fresh session with different synthetic inputs. Verified 17 unit and 22 browser tests. Development run IDs: savings 3b1dffe5-ade5-4e07-b06e-f9df2a1e897b, review a1023f21-7521-4ca9-9478-92a3a8ed8ea7. Final evidence will be regenerated from committed source. Promotion review remains part of the operator layer.
- [x] P7: Live-session handoff. Verified exclusive claim, stale commands, premature resume, native dialog and session restoration in the original browser. The React console passed desktop, mobile form-state, keyboard, authorization and accessibility checks. A genuine console discovery passed fresh replay and explicit artifact review/approval. This operator exercise was driven through the UI by the development agent, not represented as an independent human recording. The owner separately completed the notice handoff successfully in run `b6e31893-3921-487c-a5cb-2c3da9477e13`. Final stage checks: 18 unit and 30 browser tests.
- [x] P8: Both workflows, typed CLI outcomes, bounded recovery and uncertain-effect cases pass. The first stability exercise completed 100/100 fresh sessions at concurrency two, with zero account commits; source and limits are recorded in docs/verification.md.
- [x] P9: Verified 22 unit and 56 browser tests, provider deadlines and cancellation, browser/journal loss, evidence quotas, prompt injection and unsupported browser channels. The non-root contained replay and independent egress probe pass locally and in Linux CI. Native and container limits are documented; final source-linked exports remain P10.
- [x] P10: Closed the PDF audit's goal/target and diagnostics gaps. Final source `c7d617c` has genuine custom-goal discovery for both workflows, prompt-version-2 revision 5 approvals, different-input validation, keyless replay, unsupported-goal rejection, business/failure cases and same-session handoff. All 23 unit and 62 browser tests pass locally, in a fresh GitHub checkout and in Linux CI. The 100/100 stability exercise and contained replay/egress checks pass; source revisions and measurement limits are explicit. Seventeen screenshots were inspected; the continuous recording, required report and exact-source evidence verifier are complete. The owner's earlier successful handoff is separately preserved. [Evidence index](evidence/README.md).

## 7. The evaluator experience

These commands are implemented. The [README](README.md) supplies the complete setup and walkthrough.

```bash
corepack yarn install --immutable
corepack yarn setup
corepack yarn doctor
corepack yarn demo
```

`demo` builds and starts Groove, then prints a private loopback launch link. Choose **New session**, a workflow and **Replay**. No model key, Docker, bank credentials or cloud service is needed for replay after installation. Each run owns a fresh synthetic target and browser. Select **Operator notice** to exercise takeover, acknowledgment and verified resume in the same live session.

For genuine discovery, configure `OPENAI_API_KEY` privately in ignored `.env.local`, then choose **Discover** in the console. A successful discovery is checked by a fresh replay with different inputs. Review its complete JSON contract before approving the immutable revision. The CLI experiment is also available:

```bash
corepack yarn discover --request <<'JSON'
{"workflow":"savings","target":"northstar","goal":"Read the available savings balance for {memberId}.","inputs":{"memberId":"A1001"}}
JSON
```

Each experiment starts its own target, performs actual provider-backed discovery, and replays the generated capability with different synthetic inputs. Its progress JSON is intended for an interactive experiment. The separate calling-agent interface accepts bounded JSON on stdin and returns exactly one result on stdout:

```bash
printf '%s' '{"memberId":"B1002"}' | node dist/src/cli/replay.js
```

Replay exits with 0 for success, 2 for a business outcome, 3 for failure or rejected input, and 4 for cancellation. Sensitive output values are suppressed by default; `--show-sensitive` explicitly returns them to the caller without adding them to persisted logs. The console displays clearly labeled synthetic values. Shutdown drains admitted work and closes owned sessions.

## 8. Decisions that must survive scrutiny

- A model's claim of completion is not proof. The declared checkpoint, subject identity and output schema must agree with the live UI.
- A capability's declared risk cannot grant permission. Trusted application policy classifies effects independently.
- Strict JSON does not make a model decision safe. Validate its target reference, action, inputs, current observation, budget and authority before dispatch.
- Locator ambiguity is a failure, not a reason to choose the first match. No unreviewed fallback or visual guess in replay.
- A timeout after an action has been dispatched creates uncertainty. Re-observe before any repeat; never automatically repeat an irreversible action.
- Human takeover transfers control, not unrestricted permission. Resume requires a checkpoint and a new ownership generation.
- An observed successful path does not establish all error branches. The reviewed application binding supplies error classifiers; the scenario suite validates them.
- Redaction applies before model transmission and before persistence, including screenshots, goal text, selectors, exceptions and operator inputs.
- A file digest proves content identity, not provenance authenticity. Production approval and signing need independently protected authority.
- A local browser context is useful session separation, not a hostile-tenant security boundary.

## 9. Resolved gates and deployment prerequisites

Legacy targeting, actual provider access, different-input reuse, exclusive handoff, image privacy and independent network denial have passing evidence. The original checkpoint and capture failures are preserved with their corrections in [the evidence history](evidence/README.md). Local stability was measured at concurrency two; no production throughput is inferred.

Production deployment still requires tenant-bound identity and secrets, isolated worker orchestration, durable ownership enforcement, signed approval authority, retention operations and load measurements against actual vendor limits. These are documented in [the scale design](docs/scale.md). Native desktop execution and arbitrary website onboarding are explicit cuts in [the report](REPORT.md).

## 10. Definition of done

Completion requires every acceptance row to have passing evidence, not simply a matching source file. At minimum: two parameterized workflows; one genuine provider-backed discovery; replay with the provider inaccessible; all runtime scenario classes; one real same-session operator exercise; sanitized richer failure evidence; tested policy denial; clean install and shutdown; required report headings; and an organized commit history.

Final review must reconcile documentation with implementation, list remaining limitations plainly, verify that all examples are reproducible from the pinned revision, and inspect the entire tracked tree for secrets, private paths, unsupported claims and em dash characters. External publication and submission remain explicit owner actions.
