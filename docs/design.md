# Design contract

Status: verified implementation contract. Both live discovery workflows, the React console, review catalog, same-session handoff, fault scenarios and local containment are implemented. [Final evidence](../evidence/README.md) links the source, runs and recording. PLAN.md records the passed gates. Deployment extensions are identified explicitly.

## 1. Trust boundaries and module responsibilities

The calling agent supplies intent and runtime arguments. The model suggests the next UI action. Neither controls the policy, the interpreter, the artifact approval decision, or the operator's authority. The UI, model responses, artifact files and operator requests are untrusted inputs.

The run coordinator owns cancellation, run identity, deadlines, session lifetime and terminal results. The discovery loop consumes observations and a decision provider. The replay interpreter consumes a validated capability and a surface interface. Both use one action executor. That executor checks ownership, policy, current target identity and action preconditions before performing an action.

The compiler converts executed discovery events into a draft capability. It cannot invent unexecuted successful steps. A reviewed application binding supplies permitted origins, known control identities, risk classifications, error markers and input/output semantics. It may teach the engine what a control means; it may not embed a complete action sequence that masquerades as model discovery.

The simulator and scenario harness are separate from the runtime. Tests may inspect fixture state as an independent oracle, but discovery and replay may only observe the UI. Browser-generated requests are allowed; direct backend integration by the automation is excluded.

## 2. Capability v1

Use a strict JSON-compatible schema with a deliberately small expression language. Reject unknown keys, unsupported schema versions, oversized files, excessive steps, duplicate IDs and invalid references before creating a browser. JSON Schema export and runtime validation come from the same Zod definitions. Add semantic validation for relationships a structural schema cannot express.

| Field | Contract |
| --- | --- |
| `schemaVersion` | Exact supported integer, initially `1`; never silently reinterpret an unknown version |
| `id`, `revision`, `description` | Stable capability name, immutable revision, reviewed description with no runtime values |
| `application` | Vendor/product family, required driver features and supported binding compatibility version; no tenant hostname or credentials |
| `inputs` | Named, required constrained string/enum/integer/boolean definitions; no coercion; sensitivity classification and intended use |
| `outputs` | Named typed definitions, sensitivity, deterministic parsing rule and source target |
| `targets` | Logical control references with explicit scope, target strategy, expected cardinality and rationale; no opaque session node IDs |
| `entry` | Registered route reference and a verifiable initial condition |
| `steps` | Ordered steps with IDs, supported action, target/value references, preconditions, postconditions, effect classification and bounded recovery reference |
| `outcomes` | Named business outcomes, detection conditions and permitted terminal step locations |
| `recovery` | Explicit known-condition handlers, exact allowed actions, bounded attempts and return checkpoint; no general scripting or arbitrary jumps |
| `success` | Conditions binding the requested subject, reached screen and declared output sources |
| `provenance` | Discovery run ID, actual provider/model, prompt-template revision, driver/browser/binding versions and source revision; no raw transcript |

A separate local registry entry pins the artifact's byte digest and binding digest and records a reviewed/approved revision. It is separate because an artifact must not approve itself. Hand-authored development fixtures are named and documented as fixtures; real evidence contains only genuinely discovered artifacts. A deliberate review and successful fresh replay are prerequisites to promote an artifact. The console records the local operator; bundled development revisions separately identify an engineering review and are not evidence of a human exercise. Editing any content creates a new revision and invalidates its prior approval.

The initial schema implements only the browser strategies we actually execute. Future desktop strategies require a new explicit schema extension and driver support check. A generic `kind: string` escape hatch would weaken validation and is excluded.

### Values and parameters

Fill and select actions accept named input references. Read actions name a declared output. Click actions name a registered target. There is no interpolation, JavaScript, arbitrary selector, output chaining or executable template. Conditions are bounded conjunctions of visible, absent, equalsInput and equalsLiteral checks. The reviewed binding supplies safe labels and literal conditions; invocation data stays in memory.

Example of the implemented step shape:

```json
{
  "id": "fill-member-id",
  "action": { "kind": "fill", "target": "member-field", "input": "memberId" },
  "preconditions": [{ "kind": "visible", "target": "search-screen" }],
  "postconditions": [{ "kind": "equalsInput", "target": "member-field", "input": "memberId" }],
  "effect": "reversible"
}
```

Entry navigation is registered as `search`. Known recovery can click one reviewed control once and verify its postconditions. The schema deliberately omits unused navigation actions, nested boolean expressions and output chaining (D10). Reads reject malformed grouping, unsupported currency, overflow and non-finite numbers. Money is integer minor units. Determinism describes execution rules; external values may change between runs.

## 3. Observation and targeting

The browser driver returns an observation generation, registered route/frame information, visible control candidates, allowed structural context, recognized state markers and an in-memory masked screenshot where safe. The model sees only this bounded observation, the goal, the task contract and named input references. It cannot inspect hidden DOM attributes for data, execute JavaScript, access the filesystem or call the simulator's backend.

Discovery decisions select a control reference from the current observation. Immediately before dispatch the driver resolves that control again. Stale observations and changed identity force a new observation, not a blind click.

Target strategies, in order of preference:

1. Exact accessible role and name inside an explicit, unique frame/screen scope.
2. Exact visible text or associated field label in that scope.
3. A reviewed relation in legacy markup, such as the input in the same form row as the exact visible "Member number" caption. Frame identity, row identity and control cardinality must all agree.

Prefer stable user-visible meaning over generated IDs, broad CSS paths and element indexes. The binding can supply an explicit fallback only if it preserves identity and has its own test. Replay records which strategy resolved; it never uses `.first()`, force clicks, fuzzy matching, or silently generated fallback selectors. Zero matches wait within the deadline or fail. Multiple matches fail as `TARGET_AMBIGUOUS` before any input.

Screenshots help discovery understand a poorly labeled screen. We are not claiming image-only deterministic replay in v1. If a control cannot be grounded into a supported stable strategy, discovery pauses for intervention or rejects the capability. A native desktop driver could implement accessibility identity and verified visual anchors later, but it must satisfy the same resolution and ambiguity contract.

## 4. Discovery and compilation

1. Resolve the registered target and reviewed task contract. Validate input types and policy compatibility. Launch a fresh owned session.
2. Observe the live UI. Replace sensitive input values and matching displayed data with reference labels in model-bound text; mask the corresponding image regions. If masking coverage is unknown, omit the image and use the safe structured view.
3. Ask the provider for exactly one structured decision: permitted action, current control reference, value reference and a bounded reason code. Do not request or persist private reasoning traces. Human-readable event reasons are generated from vetted templates.
4. Handle refusal, incomplete response, malformed decision, timeout and rate limit separately. No parsing repair that could change action meaning. A bounded retry may repeat a failed model request, but no UI action is dispatched until a valid decision is accepted.
5. Pass the decision to the shared executor and observe its outcome. Journal the sanitized action, decision reference, policy decision and actual result.
6. Stop on verified completion, cancellation, budget exhaustion, no-progress detection, policy denial or a state requiring intervention. A model `finish` request is advisory until the task contract's conditions pass.
7. Compile only a successful executed path. Resolve observation references into stable target descriptors and parameter bindings. Keep the raw journal separate. A recovery detour must be represented by an explicit tested handler or rejected as unsuitable for publication; do not silently delete history to create a cleaner-looking flow.
8. Validate structure and semantics, scan for sensitive values, and write a draft atomically. Replay it in a fresh session with different synthetic inputs. Compare actual output to an independent test oracle. Promote only after review and passing replay validation.

Implemented P6 limits are 30 model decisions, 180 seconds active discovery, 30 seconds per provider request, 2,000 output tokens per request, 24 KB of structured observation and a 1 MB masked low-detail image. Aggregate reported tokens are limited to 120,000. Repeating the same action on the same screen stops as `NO_PROGRESS`. SDK retries are disabled: a provider failure ends this discovery attempt without replaying a UI action.

The OpenAI adapter admits a request only if a conservative $0.50 reservation fits within its $2 estimated run budget. A completed response reconciles this against reported tokens at the researched standard rates ($10 input and $50 output per million, 2026-09-11). A failed or timed-out call retains the reservation. Each pending request is also canceled when the remaining active execution budget expires; user cancellation is reported separately. Refusal, invalid responses and transport failure have distinct safe classifications. This is application admission accounting, not a provider billing guarantee; account-level spending controls remain separate. Standard service tier is explicit. [Published pricing](https://openai.com/index/gpt-6-astra/).

SDK retries are disabled to avoid multiplying retry layers. Cancellation stops new commands and aborts model requests; it cannot undo a UI effect already sent. Both final genuine discoveries completed within the configured budgets.

## 5. Replay and result semantics

Replay resolves a reviewed artifact revision plus a registered application binding and validated inputs. It checks compatibility and effective policy before opening a session. It has no provider instance, key requirement, or model fallback.

At each step: check ownership and cancellation; classify current state; evaluate preconditions; uniquely resolve the target; authorize the exact action and its effect; dispatch once; wait for a declared postcondition or a classified competing state; record the result. Business outcomes and safety blockers take precedence over success if both appear. Conflicting state markers fail explicitly instead of being arbitrarily ordered.

| Result | Meaning | Example |
| --- | --- | --- |
| `success` | Final checkpoint and output validation passed | Savings balance returned for the requested member |
| `business_outcome` | Valid known response with a typed code | `MEMBER_NOT_FOUND`, `ACCOUNT_NOT_FOUND`, `VALIDATION_REJECTED` |
| `failure` | A technical, policy or unresolved execution condition stopped the run | `PERMISSION_DENIED`, `TARGET_AMBIGUOUS`, `APP_UNAVAILABLE`, `UNSUPPORTED_BINDING`, `POLICY_DENIED`, `UNCERTAIN_EFFECT` |
| `canceled` | Caller or operator terminated the run | No new commands; any already dispatched effect is reported |

`awaiting_human` is a nonterminal run state, not a successful final result. A failed intervention deadline becomes a typed failure. Business outcomes have code and safe schema-defined details, not partial success output. Failure details include step ID, action type, safe expected/observed condition summaries, effect state (`not_dispatched`, `confirmed`, `unknown`), retry count, session/run identity and a sanitized evidence reference. Never serialize a raw Playwright/provider error message directly.

### Recovery rules

- Slow load: wait for the declared condition within one bounded deadline. Do not use a fixed sleep as proof that a screen is ready.
- Known notice: run a reviewed dismiss action once, verify the notice is gone and the interrupted step's precondition holds.
- Missing member or account: return a business outcome immediately.
- Validation rejection: return the declared outcome; never invent different business input to make the form pass.
- Permission denied: pause or fail, with no privilege escalation or alternate account search.
- Session expiry: pause for operator intervention. Resume at the current step only if its preconditions and subject identity are restored. If the entry state is restored instead, restart only a capability explicitly classified as read-only and only with operator acknowledgment. Review/form flows otherwise stop and require a fresh run.
- Unexpected modal or unknown screen: pause with safe evidence. Unknown browser-native dialogs remain pending under the same session and are exposed as an intervention; no blanket auto-accept handler.
- Timeout after click: inspect the postcondition and known outcomes first. Retry only an explicitly repeat-safe action when the precondition establishes a safe state. An unobservable effect stops as `UNCERTAIN_EFFECT`.
- Process or browser crash: report interruption from the persisted safe journal if available; do not recreate a session and claim it is the original live session.

Exactly-once execution of arbitrary legacy UI side effects is not a guarantee the system can provide. A durable job ID can deduplicate job admission; it cannot prove whether a bank screen committed a transaction before losing its response.

## 6. Policy and data handling

Effective permission is the intersection of trusted installation policy, reviewed binding policy, and the capability's requested permissions. An artifact can narrow authority but cannot expand it. Risk classification comes from the binding's known control/effect map, never from model wording or button-text heuristics alone. Unknown controls/effects are denied.

Allowlist exact origins, normalized registered routes, permitted query keys, HTTP methods and permitted UI actions. Reject URL userinfo, unregistered schemes, unregistered ports and unapproved navigation. Check before action and at the browser request boundary, including frames, resource loads, forms, redirects, popups and downloads. Service workers are blocked. WebSockets, downloads and file selection are denied unless explicitly implemented and tested. A route check after navigation is detection, not prevention.

The initial target requires no redirects. Its intercepted requests use bounded fetching with automatic redirects and retries disabled; redirect responses fail closed. The actual request receiver tests must prove this behavior on the pinned browser. Arbitrary target support is disabled. Native browser hooks remain application guardrails, not complete network isolation. The container profile and future tenant worker boundary restrict egress independently; see [verification](verification.md) and [scale](scale.md).

The final account-opening action is blocked in v1 for automation and mediated operators. A person cannot approve a forbidden action by setting `confirmed: true`. The review page is the capability's terminal boundary. Production write capabilities would require reviewed effect semantics, transaction-specific authorization and reconciliation before expanding this policy.

Persist schema-approved event fields only. Safe identifiers and allowlisted static labels describe what happened; sensitive inputs, output values, goals, DOM text, prompt contents, cookies, storage state, request bodies, credentials and raw screenshots do not enter logs. Do not hash low-entropy member IDs as a supposed anonymization method. Keep runtime values out of persisted evidence. Release the active session after completion. The authenticated console retains output in its bounded in-memory run history until eviction or shutdown. A sanitization failure stops evidence export rather than falling back to raw data.

The guaranteed richer failure signal is a structural snapshot: safe registered route, frame tree, control types, visible/enabled flags, vetted label references, matching counts, condition evaluations and ownership state. Unknown strings are omitted. Screenshots are optional and use native opaque pixel masks before leaving the process. An application-owned allowlist covers visible text outside masked regions. Unknown text, unexpected frames, image/canvas/video content, backgrounds or generated text causes image omission; a missing image policy also defaults to omission. This targets the supported banking UI and is not a general redactor for arbitrary rendered content. Screenshot-only CSS was rejected after a canary experiment showed that the target CSP could block it. Masks can obscure overlapping notice content; the authenticated inspector supplies the registered intervention reason and permitted controls. Full traces and videos are disabled by default because they can contain sensitive page/network data. Synthetic evidence is exported explicitly after scanning and visual review.

Use `store: false` for provider requests, but do not equate that setting with zero provider retention. Production financial data needs approved provider controls and data policy; the submission sends synthetic data only.

## 7. Human control transfer

```mermaid
stateDiagram-v2
  [*] --> Automation
  Automation --> Pausing: intervention required
  Pausing --> AwaitingHuman: action settles or is classified uncertain
  AwaitingHuman --> Human: exclusive claim
  Human --> Resuming: return control
  Resuming --> Automation: resume conditions verified
  Resuming --> AwaitingHuman: incompatible live state
  Human --> AwaitingHuman: operator lease expires
  Automation --> Terminal: result or cancellation
  AwaitingHuman --> Terminal: deadline or cancellation
  Human --> Terminal: cancellation
  Terminal --> [*]
```

Ownership contains `sessionId`, `runId`, `owner`, monotonically increasing `epoch`, and operator identity when applicable. The controller serializes commands and state transitions. It does not hold an action queue open to old commands after a transfer. Every command carries the expected epoch and is checked again at dispatch.

Pausing rejects new automation commands and resolves the in-flight action's known/unknown status before granting human control. A second claimant receives a conflict. A stale automation response or stale operator tab cannot act after an ownership change. Lease expiry pauses the session; it does not silently return control to automation.

A timeout wrapper alone is not cancellation: the underlying browser command must settle or be stopped before another owner may issue input. If command quiescence cannot be established, retain a blocked session or terminate it with a failure. Application-side asynchronous effects can still complete after the input command settles; show that uncertainty to the operator and require re-observation before any conflicting action.

The console is a small loopback service with an intervention list, safe reason/current-step view, live screenshot or structural view, claim, click/type/select controls, dialog controls, return-control and cancel. Its commands drive the existing browser/page object through the executor. It never opens a replacement browser session. Human actions are individually recorded with actor, epoch, step context and sanitized target/value references. These events remain a separate manual segment and do not silently alter the saved capability.

Bind to loopback, validate Host and Origin, require a per-session high-entropy credential, restrict request sizes, expire credentials, and reject stale generations. No credential in query logs or persisted evidence. Console bootstrap should use a URL fragment exchanged for an in-memory credential with immediate fragment removal; requests use an authorization header. The target application never receives the operator credential or the model key. Provider and operator routes are outside the target's allowed browser origins.

The normal manual path uses mediated console commands so authority and action evidence are enforceable. Direct DevTools or unmanaged browser input is outside this guarantee and is disabled in the default flow. The local operator name is attribution on a trusted workstation, not enterprise identity proof. Production requires authenticated operator identities and per-tenant authorization.

Before resuming, revoke human command admission, wait for any accepted human command to settle, increment the epoch, re-observe, verify current step/subject preconditions and policy, then re-enable automation. A human "done" click never marks the goal successful by itself. Polls and commands are bounded; a ten-minute initial intervention TTL prevents orphaned sessions, with explicit remaining-time display.

## 8. Persistence and lifecycle

Artifacts are immutable after promotion. Write and flush a temporary file in the destination directory, then publish it through a hard link that cannot replace an existing revision. Delete the temporary name afterward. Serialize bounded journal events with sequence numbers; disk write failures are surfaced. Enforce per-run event and byte limits. Persist action intent before dispatch and outcome afterward; if audit persistence is unavailable, stop new actions. A crash between these records means the effect may be unknown.

The local runner supports one active session per invocation and bounded independent invocations. Each gets a separate browser process/context, credentials, output directory and lifecycle. Ownership is in-process; it is not a distributed lease. The journal records run start and terminal result without browser state or inputs. A journal without a terminal event is incomplete; it does not establish success or distinguish a still-running process from a crash. There is no automatic session recovery after process loss.

Cancellation also reaches the fresh replay used to validate a discovery; a canceled validation cannot be approved. A late screenshot poll cannot replace the final retained image after execution ends.

On cancellation, stop admitting commands, settle or classify the in-flight operation, close the browser, expire operator credentials, drain safe journal writes and stop owned servers. Terminate only processes created by this run. Normal runtime files live in ignored `.local/`; submission evidence is a deliberate reviewed export. Individual journals are bounded to 2,000 events and 1 MiB. Total on-disk retention is manual in this local edition; automatic age/size retention and protected archival are production prerequisites. Filesystem deletion is not a cryptographic erasure guarantee.

## Public discovery invocation

`DiscoveryIntent` carries a caller's public English goal and the registered `northstar` target. The console requires these fields in discovery mode; `discover --request` accepts them with the workflow contract and typed arguments over bounded JSON stdin. The member-search entry point comes from the reviewed binding. Only a supported contract is executable, and unsupported goals yield `GOAL_UNSUPPORTED`. The SDK request contains the prepared caller goal; neither compiled capabilities nor journals copy it. Sensitive argument values are replaced with references before transmission, with narrow input-shape rejection as documented in README. This does not authorize arbitrary private text or arbitrary URLs.

Failure results carry structural expected/observed diagnostics with no raw value: expected conditions and output parser/allowlist, observed screen/state and condition satisfaction. Startup failures have no invented observation. Operator and CLI consumers receive the same diagnosis; the runtime persists it alongside the step and effect state.
