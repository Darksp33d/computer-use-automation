# Computer-Use Automation System

Groove, verified on 2026-09-11. Two genuine model discoveries produced reviewed, reusable capabilities. The suite passes 22 unit and 58 browser tests; 100 fresh local replays passed without retries. [Runs, recording and measurement limits](evidence/README.md).

## Architecture

The system turns one model-discovered UI workflow into a reusable capability. A local fictional banking application supplies synthetic data, an iframe workspace, nested tables, generated element IDs and intentionally imperfect labels. The primary flow searches for a member, opens their savings account and reads the available balance. A second flow prepares a sub-account form and stops at review.

TypeScript on Node.js 24 keeps the artifact, CLI, driver and operator contracts in one language. Playwright supplies real UI interaction and frame-aware targeting. The OpenAI Responses adapter supplies one strict decision per live observation, with masked screenshots, parameter references and bounded usage. Zod validates untrusted data. React with TypeScript and Vite provides the stateful operator workspace, with static assets served by the local control server. The target retains intentionally legacy HTML and iframe navigation. Server-side authorization and policy remain the security boundary; the frontend framework does not confer trust.

The run coordinator owns session lifetime. Discovery and replay share a policy-checked action executor, while replay has no dependency on the provider. The surface driver owns observation, target resolution and input. A separate compiler produces the artifact from actions that actually succeeded. Application bindings describe control meaning and known states without prescribing a workflow sequence. [Technology rationale and primary sources](docs/decisions.md).

## Artifact schema

A capability is strict versioned JSON with a stable ID, immutable revision, application compatibility, typed inputs/outputs, logical targets, ordered steps, preconditions, postconditions, known outcomes, bounded recovery and a success checkpoint. Runtime values are references, not literals. Money uses integer minor units and an explicit currency. Structural validation is followed by reference and compatibility validation before a browser opens.

The artifact is independent of the model transcript. Its provenance identifies the genuine discovery run and tool versions without preserving sensitive prompts or observations. A separate review record pins artifact and binding digests; the artifact cannot approve itself. A fresh-session replay with a second member establishes basic reuse before promotion. No arbitrary code or general expression language is embedded. [Full contract](docs/design.md).

## Determinism & error handling

Replay interprets the saved steps without a model, uniquely resolves each target, verifies conditions and extracts typed output from the UI. Exact role/text targets within frame scopes are preferred. Legacy controls use reviewed relations to visible captions; generated IDs and positional first-match choices are excluded. Ambiguity stops execution.

Business outcomes such as member absent and validation rejected are separate from technical failures. Known notices have bounded recovery; unknown dialogs and expired sessions require intervention. A timeout after a click does not authorize a repeat: the engine re-observes, verifies the effect, or reports uncertainty. Final success requires the requested member, account type, screen and output schema to agree. Deterministic execution does not imply that a changing bank balance must be identical across runs. [Acceptance scenarios](docs/verification.md).

## Heterogeneity & multi-tenant

The core depends on observation, target resolution and action interfaces rather than Playwright objects. V1 implements a legacy browser surface. Screenshots assist discovery, but deterministic image-only or desktop replay is not claimed. A desktop driver would need to satisfy the same identity, ambiguity and verification contract using accessibility controls or verified visual anchors.

At scale, a capability references vendor-neutral logical controls; a vendor binding supplies product/version semantics; a tenant binding supplies origins and reviewed overrides. Overrides cannot elevate policy or silently change business meaning. Compatibility checks, canary runs, immutable revisions and cohort rollout manage drift.

An isolated session worker must remain responsible for its live session. A future control plane supplies tenant authentication, bounded queues, quotas, durable ownership generations and approved artifact distribution. Millions of active UI sessions require measured capacity and vendor concurrency limits, not just a horizontally scaled API. [Capacity and deployment design](docs/scale.md).

## Escalation & handoff

The coordinator detects a blocked state, stops command admission, settles or classifies any in-flight effect, and raises an intervention containing safe run/step context. One operator can claim the session. A monotonically increasing ownership epoch invalidates stale automation decisions and operator commands.

The loopback console drives the same browser/page through mediated click, type, select and dialog controls. Each manual action records actor and sanitized target context. Returning control revokes human command admission, waits for accepted actions to settle, re-observes and verifies the resume checkpoint. A human acknowledgment cannot bypass policy or declare success. Disconnection leaves the session paused until a bounded deadline. A crash does not pretend to preserve a lost live session.

## Safety

The optional local container profile has passed an independent egress probe and real replay. Non-root workers use read-only filesystems, dropped host capabilities and resource limits; Chromium’s sandbox stays enabled. The browser has no published network port, and host control crosses a bounded stdin/stdout stream. See `docs/containment.md` for the verified scope and remaining production prerequisites.

Trusted policy restricts origins, routes, methods, controls and effects before dispatch. Artifacts and model responses cannot grant themselves permission. Unknown effects and the final account-opening action are blocked. Browser request controls, service-worker blocking and redirect denial protect the supported target; network-enforced worker isolation is a separate production requirement.

Events and artifacts contain allowlisted fields and input references. Sensitive values, goals, credentials, browser storage, raw exceptions and traces are excluded. A sanitized structural failure snapshot supplies richer evidence even when an image cannot be safely masked. Only synthetic data is used for provider calls and submission evidence. Provider storage settings are documented without claiming zero retention. The operator endpoint uses a local credential, Origin/Host checks and ownership epochs; enterprise operator identity is a deployment requirement.

## Cuts

The implementation deliberately excludes real bank access, irreversible transactions, native desktop execution, arbitrary website onboarding, distributed scheduling, enterprise operator SSO, model recovery during replay and a full co-browsing product. These are explicit boundaries, not mock replacements for the core assignment. Genuine discovery, parameterized replay, exceptional outcomes, policy enforcement, safe evidence and live-session handoff must all work.

The next deployment work is production orchestration of isolated workers, durable ownership enforcement, tenant-bound identity and secrets, controlled capability rollout and measured capacity. A second tenant variant is an optional extension only after every core gate passes. The evidence distinguishes live provider runs, scripted checks and the owner’s confirmed development handoff. Local replay latency was p50 1.09 s and p95 1.15 s at concurrency two, including browser startup. This sample does not establish production throughput or availability.
