# Computer-Use Automation System

Planning edition. This describes the proposed system; application behavior and run evidence are not yet implemented. The final report will be reconciled with the tested code and genuine evidence before submission. The detailed working checklist is in [PLAN.md](PLAN.md).

## Architecture

The system will turn one model-discovered UI workflow into a reusable capability. A local fictional banking application will supply synthetic data, an iframe workspace, nested tables, generated element IDs and intentionally imperfect labels. The primary flow searches for a member, opens their savings account and reads the available balance. A second flow prepares a sub-account form and stops at review.

TypeScript on Node.js 24 keeps the artifact, CLI, driver and operator contracts in one language. Playwright supplies real UI interaction and frame-aware targeting. A small OpenAI adapter supplies structured discovery decisions. Zod validates untrusted data. Native HTTP and a small HTML interface are sufficient for the target and operator console; no database or application framework is needed for local execution.

The run coordinator owns session lifetime. Discovery and replay share a policy-checked action executor, while replay has no dependency on the provider. The surface driver owns observation, target resolution and input. A separate compiler produces the artifact from actions that actually succeeded. Application bindings describe control meaning and known states without prescribing a workflow sequence. [Technology rationale and primary sources](docs/decisions.md).

## Artifact schema

A capability will be strict versioned JSON with a stable ID, immutable revision, application compatibility, typed inputs/outputs, logical targets, ordered steps, preconditions, postconditions, known outcomes, bounded recovery and a success checkpoint. Runtime values are references, not literals. Money uses integer minor units and an explicit currency. Structural validation is followed by reference and compatibility validation before a browser opens.

The artifact is independent of the model transcript. Its provenance identifies the genuine discovery run and tool versions without preserving sensitive prompts or observations. A separate review record pins artifact and binding digests; the artifact cannot approve itself. A fresh-session replay with a second member establishes basic reuse before promotion. No arbitrary code or general expression language is embedded. [Full contract](docs/design.md).

## Determinism & error handling

Replay will interpret the saved steps without a model, uniquely resolve each target, verify conditions and extract typed output from the UI. Exact role/text targets within frame scopes are preferred. Legacy controls use reviewed relations to visible captions; generated IDs and positional first-match choices are excluded. Ambiguity stops execution.

Business outcomes such as member absent and validation rejected are separate from technical failures. Known notices have bounded recovery; unknown dialogs and expired sessions require intervention. A timeout after a click does not authorize a repeat: the engine re-observes, verifies the effect, or reports uncertainty. Final success requires the requested member, account type, screen and output schema to agree. Deterministic execution does not imply that a changing bank balance must be identical across runs. [Acceptance scenarios](docs/verification.md).

## Heterogeneity & multi-tenant

The core depends on observation, target resolution and action interfaces rather than Playwright objects. V1 implements a legacy browser surface. Screenshots assist discovery, but deterministic image-only or desktop replay is not claimed. A desktop driver would need to satisfy the same identity, ambiguity and verification contract using accessibility controls or verified visual anchors.

At scale, a capability references vendor-neutral logical controls; a vendor binding supplies product/version semantics; a tenant binding supplies origins and reviewed overrides. Overrides cannot elevate policy or silently change business meaning. Compatibility checks, canary runs, immutable revisions and cohort rollout manage drift.

An isolated session worker must remain responsible for its live session. A future control plane supplies tenant authentication, bounded queues, quotas, durable ownership generations and approved artifact distribution. Millions of active UI sessions require measured capacity and vendor concurrency limits, not just a horizontally scaled API. [Capacity and deployment design](docs/scale.md).

## Escalation & handoff

The coordinator will detect a blocked state, stop command admission, settle or classify any in-flight effect, and raise an intervention containing safe run/step context. One operator can claim the session. A monotonically increasing ownership epoch invalidates stale automation decisions and operator commands.

The loopback console will drive the same browser/page through mediated click, type, select and dialog controls. Each manual action records actor and sanitized target context. Returning control revokes human command admission, waits for accepted actions to settle, re-observes and verifies the resume checkpoint. A human acknowledgment cannot bypass policy or declare success. Disconnection leaves the session paused until a bounded deadline. A crash does not pretend to preserve a lost live session.

## Safety

Trusted policy will restrict origins, routes, methods, controls and effects before dispatch. Artifacts and model responses cannot grant themselves permission. Unknown effects and the final account-opening action are blocked. Browser request controls, service-worker blocking and redirect denial protect the supported target; network-enforced worker isolation is a separate production requirement.

Events and artifacts contain allowlisted fields and input references. Sensitive values, goals, credentials, browser storage, raw exceptions and traces are excluded. A sanitized structural failure snapshot supplies richer evidence even when an image cannot be safely masked. Only synthetic data is used for provider calls and submission evidence. Provider storage settings are documented without claiming zero retention. The operator endpoint uses a local credential, Origin/Host checks and ownership epochs; enterprise operator identity is a deployment requirement.

## Cuts

The implementation deliberately excludes real bank access, irreversible transactions, native desktop execution, arbitrary website onboarding, distributed scheduling, enterprise operator SSO, model recovery during replay and a full co-browsing product. These are explicit boundaries, not mock replacements for the core assignment. Genuine discovery, parameterized replay, exceptional outcomes, policy enforcement, safe evidence and live-session handoff must all work.

The next deployment work is isolated session workers, durable ownership enforcement, tenant-bound identity and secrets, controlled capability rollout and measured capacity. A second tenant variant is an optional extension only after every core gate passes. The repository's evidence will distinguish real provider runs, deterministic test fixtures and manual operator exercises. No production throughput or reliability percentage will be claimed without measurements.
