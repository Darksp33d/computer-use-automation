# Decisions and research notes

Status: planning decisions, researched 2026-09-11. Links are primary sources. Their documented behavior supports a choice; it does not prove that our implementation works. The exit gates in PLAN.md supply that proof.

## D01. A complete local core with an explicit deployment design

The assignment evaluates artifact quality, correct replay, real handoff and sensible scope. The owner requires exceptional engineering and a credible path to millions of concurrent users. We will implement all required core capabilities and deeply verify their boundaries, while documenting production scheduling and isolation separately. Building a cloud control plane before proving one replay would defer the highest-risk work without establishing capacity.

One supervised process per local run avoids distributed coordination during the assignment. It does not erase the need for distributed leases at scale. A process crash cannot resume its lost browser. That limitation is represented in the result contract and deployment plan.

## D02. TypeScript and Node.js 24 LTS

TypeScript is the best fit for this particular deliverable because the browser driver, provider client, CLI and small operator client can share a single typed contract. This reduces serialization drift and installation steps. Strict compilation is supplemented by runtime validation at untrusted boundaries. Node 24 is an LTS line suitable for the dependency ecosystem. Pin a supported patched release during bootstrap; the machine's currently installed patch is not automatically the project baseline. [TypeScript strict option](https://www.typescriptlang.org/tsconfig/strict.html), [Node release policy](https://nodejs.org/en/about/previous-releases).

Python would be a strong choice if native OS automation, OCR or computer vision were the primary implemented surface. Adding Python now creates another runtime without a demonstrated benefit. Go or Rust could suit control-plane services later, but no measured CPU bottleneck justifies a separate language in a browser-I/O-bound core. Neither TypeScript nor a faster language removes the browser's resource cost.

## D03. Playwright for perception and action

Playwright provides fresh locator resolution, frame scoping and actionability checks. We will build on these semantics rather than creating a coordinate-click replay system. Waiting must target an observable condition. A control that is visible and clickable still may be the wrong control, so policy, scope, cardinality and postconditions remain our responsibility. [Locators](https://playwright.dev/docs/locators), [actionability](https://playwright.dev/docs/actionability).

Selenium is viable but adds no required capability for the chosen TypeScript browser slice. Raw CDP creates more browser-specific lifecycle work. A broad agent framework can discover tasks but does not remove the need for our own policy, replay contract and ownership rules. Screenshot-only actions are valuable for opaque desktops; raw coordinates alone are a weak reusable identity. V1 uses visual context during discovery and verified semantic/relational browser targets on replay, with unsupported opaque controls failing closed.

## D04. A small declarative capability, not generated executable code

Zod supplies runtime parsing, inferred types and JSON Schema export. Use a supported JSON-compatible subset with semantic validation for references and constraints. The artifact is deliberately data, not an arbitrary program. [Zod JSON Schema support](https://zod.dev/json-schema).

Generated Playwright scripts are easy to demonstrate but harder to constrain and version as agent-invocable contracts. A full workflow engine or expression language introduces loops, arbitrary branches and security semantics unnecessary for two bounded flows. A straight-line sequence with explicit conditions, business outcomes and bounded known recovery is sufficient.

Unknown schema versions are rejected. Introduce migrations only when a real version change exists; do not write a speculative migration framework. Canonical formatting plus a digest of exact published bytes gives reviewable content identity. It is not a signature or an authorization system.

## D05. One provider adapter, one decision per observation

Use the official OpenAI SDK and Responses API with a strict decision schema. The discovery model is `gpt-6-astra`, selected by the owner on 2026-09-11 and replacing the earlier candidate `gpt-5.4-2026-03-05`. The model page documents image input, structured outputs, computer-use support and a `reasoning.effort` setting from `low` to `max`. Start at `low`; OpenAI's published calibration states Astra at `low` performs better than the previous flagship at `high`, and discovery is infrequent so the higher per-token price is acceptable. Availability for the owner's account and task success are not yet verified. P6 must establish both before the decision is considered validated. [GPT-6 Astra model page](https://developers.openai.com/api/docs/models/gpt-6-astra), [GPT-6 Astra announcement](https://openai.com/index/gpt-6-astra/).

Only the `gpt-6-astra` alias is published; no dated snapshot exists at the time of this decision. The alias can change behavior underneath us. Compensate by recording the exact model string returned by the API, each response ID and token usage in artifact provenance and run evidence, and re-run the live discovery if a snapshot becomes available or the alias is observed to change behavior. Do not claim byte-for-byte reproducibility of a discovery run; claim only that the compiled artifact replays deterministically.

Official computer-use guidance supports custom UI tools alongside other integration approaches. We choose a narrow structured action interface because the assignment needs reviewable, policy-checked individual actions. No model-generated scripts are executed. Strict output shape does not remove refusal or incomplete-response handling. [Computer use](https://developers.openai.com/api/docs/guides/tools-computer-use), [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

A newer flagship or smaller model may be better after task-specific measurement. The substitution rule is explicit: verify documented support, run the same live task, compare completion, invalid actions, latency and usage, then record the new decision and evidence. Do not implement automatic cross-provider fallback or silently change the model between runs. Discovery is infrequent; replay cost and latency come from UI execution, not model inference.

## D06. Provider retention is separate from local redaction

Use synthetic data, sanitize model observations and disable response storage. `store: false` is not a promise of zero retention across provider systems; documented abuse-monitoring and other retention rules still matter. Real bank data requires institution-approved provider settings and review. [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

The model does not need a literal member ID to decide to fill the member-ID control. It can request an input reference which the runtime resolves privately. Do not send credentials or raw banking data simply because the discovery prompt says to keep them secret.

## D07. Guardrails require more than a navigation allowlist

Playwright service-worker behavior can bypass ordinary request routing, so the supported fixture blocks service workers. Intercepted fetches must disable automatic redirects and retries. Tests must cover actual receiver-side effects for frames, popups and other traffic, not merely validate URL strings. [Service workers](https://playwright.dev/docs/service-workers), [route fetch options](https://playwright.dev/docs/api/class-route#route-fetch), [browser context APIs](https://playwright.dev/docs/api/class-browsercontext).

Network isolation is a separate boundary. The containment profile uses an internal browser/target network and a constrained control connection; production needs an enforced egress policy on isolated workers. Docker supports internal networks, while Playwright documents browser-container and user/sandbox considerations. A container alone is not a complete security claim. [Compose internal networks](https://docs.docker.com/reference/compose-file/networks/#internal), [Playwright Docker guidance](https://playwright.dev/docs/docker).

## D08. Explicit effect uncertainty and exclusive ownership

A retry is only safe when repeating the operation preserves intended business meaning. A lost response may leave the effect unknown, so an engine must re-observe and sometimes stop. UI automation has fewer reconciliation guarantees than an API designed for idempotency. [AWS Builders' Library on safe retries](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/).

A small explicit state machine and a serialized command gate are sufficient locally. No state-machine framework is needed initially. Handoff operates the original session through mediated commands; a new browser window with copied cookies would not satisfy the requirement. Epochs reject stale actions. Distributed deployment additionally needs an enforcing session gateway and durable ownership records.

## D09. Small UI and reproducible tooling

The operator needs an inbox, current state, manual controls and resume/cancel actions. Native HTTP plus plain HTML/CSS and typed client code can satisfy that bounded interface. React, Next.js, Tailwind, a component system and global state management are unnecessary for the first version. Reconsider only if the operator workflow grows enough to justify them.

Yarn's immutable install checks that dependency resolution does not alter the lockfile. The native Node test runner covers contracts/state transitions; Playwright Test covers real-browser workflows. Formatting/linting tooling is introduced in bootstrap with exact versions. [Yarn install](https://yarnpkg.com/cli/install), [Node test runner](https://nodejs.org/docs/latest-v24.x/api/test.html).

No database is needed for a local capability and sanitized journal. Atomic files and a bounded writer satisfy the local lifecycle. Production metadata, leases and tenant authorization require durable services, as specified in the scale plan.

## Change log

| Date | Decision | State |
| --- | --- | --- |
| 2026-09-11 | D01-D09 recorded | Proposed; validate at their implementation gates |

When evidence changes a decision, add a dated entry explaining the trigger, replacement, validation and effect on prior artifacts. Keep the final design coherent rather than accumulating incompatible alternatives.
