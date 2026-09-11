# Decisions and research notes

Status: implementation decisions, researched and verified 2026-09-11. Links are primary sources. Their documented behavior supports a choice; it does not prove that our implementation works. The exit gates in PLAN.md supply that proof.

## D01. A complete local core with an explicit deployment design

The assignment evaluates artifact quality, correct replay, real handoff and sensible scope. The owner requires exceptional engineering and a credible path to millions of concurrent users. The implementation covers the required core capabilities and verifies their boundaries, with production scheduling and isolation documented separately. Building a cloud control plane before proving one replay would defer the highest-risk work without establishing capacity.

One supervised process per local run avoids distributed coordination during the assignment. It does not erase the need for distributed leases at scale. A process crash cannot resume its lost browser. That limitation is represented in the result contract and deployment plan.

## D02. TypeScript and Node.js 24 LTS

TypeScript is the best fit for this particular deliverable because the browser driver, provider client, CLI and small operator client can share a single typed contract. This reduces serialization drift and installation steps. Strict compilation is supplemented by runtime validation at untrusted boundaries. Node 24 is an LTS line suitable for the dependency ecosystem. Pin a supported patched release during bootstrap; the machine's currently installed patch is not automatically the project baseline. [TypeScript strict option](https://www.typescriptlang.org/tsconfig/strict.html), [Node release policy](https://nodejs.org/en/about/previous-releases).

Python would be a strong choice if native OS automation, OCR or computer vision were the primary implemented surface. Adding Python now creates another runtime without a demonstrated benefit. Go or Rust could suit control-plane services later, but no measured CPU bottleneck justifies a separate language in a browser-I/O-bound core. Neither TypeScript nor a faster language removes the browser's resource cost.

## D03. Playwright for perception and action

Playwright provides fresh locator resolution, frame scoping and actionability checks. The driver uses these semantics for deterministic target resolution. Waiting must target an observable condition. A control that is visible and clickable still may be the wrong control, so policy, scope, cardinality and postconditions remain our responsibility. [Locators](https://playwright.dev/docs/locators), [actionability](https://playwright.dev/docs/actionability).

Selenium is viable but adds no required capability for the chosen TypeScript browser slice. Raw CDP creates more browser-specific lifecycle work. A broad agent framework can discover tasks but does not remove the need for our own policy, replay contract and ownership rules. Screenshot-only actions are valuable for opaque desktops; raw coordinates alone are a weak reusable identity. V1 uses visual context during discovery and verified semantic/relational browser targets on replay, with unsupported opaque controls failing closed.

## D04. A small declarative capability, not generated executable code

Zod supplies runtime parsing, inferred types and JSON Schema export. Use a supported JSON-compatible subset with semantic validation for references and constraints. The artifact is deliberately data, not an arbitrary program. [Zod JSON Schema support](https://zod.dev/json-schema).

Generated Playwright scripts are easy to demonstrate but harder to constrain and version as agent-invocable contracts. A full workflow engine or expression language introduces loops, arbitrary branches and security semantics unnecessary for two bounded flows. A straight-line sequence with explicit conditions, business outcomes and bounded known recovery is sufficient.

Unknown schema versions are rejected. Introduce migrations only when a real version change exists; do not write a speculative migration framework. Canonical formatting plus a digest of exact published bytes gives reviewable content identity. It is not a signature or an authorization system.

## D05. One provider adapter, one decision per observation

Use the official OpenAI SDK and Responses API with a strict decision schema. The discovery model is `gpt-6-astra`, selected by the owner on 2026-09-11 and replacing the earlier candidate `gpt-5.4-2026-03-05`. The model page documents image input, structured outputs, computer-use support and a `reasoning.effort` setting from `low` to `max`. Start at `low`; OpenAI's published calibration states Astra at `low` performs better than the previous flagship at `high`, and discovery is infrequent so the higher per-token price is acceptable. P6 development verified account access and a successful savings discovery at low effort, followed by model-free replay with a different member. The account-preparation discovery also passed and replayed with different parameters. The final committed-source capture and reviewed revision 5 artifacts are indexed in [the evidence export](../evidence/README.md). [GPT-6 Astra model page](https://developers.openai.com/api/docs/models/gpt-6-astra), [GPT-6 Astra announcement](https://openai.com/index/gpt-6-astra/).

Only the `gpt-6-astra` alias is published; no dated snapshot exists at the time of this decision. The alias can change behavior underneath us. Compensate by recording the exact model string returned by the API, each response ID and token usage in artifact provenance and run evidence, and re-run the live discovery if a snapshot becomes available or the alias is observed to change behavior. Do not claim byte-for-byte reproducibility of a discovery run; claim only that the compiled artifact replays deterministically.

Official computer-use guidance supports custom UI tools alongside other integration approaches. We choose a narrow structured action interface because the assignment needs reviewable, policy-checked individual actions. No model-generated scripts are executed. Strict output shape does not remove refusal or incomplete-response handling. [Computer use](https://developers.openai.com/api/docs/guides/tools-computer-use), [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

The model comparison focuses on grounding, business workflows and unwanted effects. OpenAI reports 92.7% on ScreenSpot-Pro without tools, 41.4% on AutomationBench against Fable 5.1's 31.4%, and a 2.4% misaligned-outcome rate against 9.5% in its internal computer-use safety evaluation. These are vendor measurements with published harness limits. ScreenSpot-Pro tests static localization, not an entire workflow; this implementation also supplies reviewed semantic controls rather than requesting coordinates. [OpenAI evaluation table and methodology](https://openai.com/index/gpt-6-astra/).

Artificial Analysis independently reports 69% on its AutomationBench-AA implementation and about one third of Fable 5.1's output tokens at maximum effort for the same Intelligence Index score. Those measurements support evaluating Astra, but do not establish this application's latency at low effort. Different OSWorld releases and harnesses are not interchangeable. The decisive local evidence is both real P6 workflows completing at `low`, followed by fresh replay with different inputs. [Artificial Analysis evaluation](https://artificialanalysis.ai/articles/benchmarking-gpt-6-astra).

The fallback evaluation order is Astra at `medium`, Claude Opus 5, then Fable 5.1 if Opus also falls short. Opus 5 supports images and structured output at half Astra's standard token price; Anthropic recommends starting there for most workloads before evaluating Fable 5.1. The earlier comparison draft attributed an 83.4% OSWorld-Verified score to Opus 5, but the cited leaderboard assigns that score to Opus 4.8; that number is excluded. [Opus 5 specifications](https://platform.claude.com/docs/en/models/opus-5/overview), [Fable 5.1 guidance](https://platform.claude.com/docs/en/models/fable-5-1/overview).

The fallback was not needed and is not implemented. Re-evaluate after two consecutive failed discoveries at the current effort, repeated invalid control references, premature completion, or budget exhaustion before step ten. These are investigation triggers, not permission to retry consequential UI actions or change providers automatically.

The substitution rule is unchanged: verify documented support, run the same live task, compare completion, invalid actions, latency and usage, then record the new decision and evidence. A fallback requires its own adapter behind the same provider interface; do not implement automatic cross-provider fallback or silently change the model between runs. Discovery is infrequent; replay cost and latency come from UI execution, not model inference.

## D06. Provider retention is separate from local redaction

Use synthetic data, sanitize model observations and disable response storage. `store: false` is not a promise of zero retention across provider systems; documented abuse-monitoring and other retention rules still matter. Real bank data requires institution-approved provider settings and review. [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

The model does not need a literal member ID to decide to fill the member-ID control. It can request an input reference which the runtime resolves privately. Do not send credentials or raw banking data simply because the discovery prompt says to keep them secret.

## D07. Guardrails require more than a navigation allowlist

Playwright service-worker behavior can bypass ordinary request routing, so the supported fixture blocks service workers. Intercepted fetches must disable automatic redirects and retries. Tests must cover actual receiver-side effects for frames, popups and other traffic, not merely validate URL strings. [Service workers](https://playwright.dev/docs/service-workers), [route fetch options](https://playwright.dev/docs/api/class-route#route-fetch), [browser context APIs](https://playwright.dev/docs/api/class-browsercontext).

Network isolation is a separate boundary. The containment profile uses an internal browser/target network and a constrained control connection; production needs an enforced egress policy on isolated workers. Docker supports internal networks, while Playwright documents browser-container and user/sandbox considerations. A container alone is not a complete security claim. [Compose internal networks](https://docs.docker.com/reference/compose-file/networks/#internal), [Playwright Docker guidance](https://playwright.dev/docs/docker).

## D08. Explicit effect uncertainty and exclusive ownership

A retry is only safe when repeating the operation preserves intended business meaning. A lost response may leave the effect unknown, so an engine must re-observe and sometimes stop. UI automation has fewer reconciliation guarantees than an API designed for idempotency. [AWS Builders' Library on safe retries](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/).

A small explicit state machine and a serialized command gate are sufficient locally. No state-machine framework is needed initially. Handoff operates the original session through mediated commands; a new browser window with copied cookies would not satisfy the requirement. Epochs reject stale actions. Distributed deployment additionally needs an enforcing session gateway and durable ownership records.

## D09. React operator console and reproducible tooling

Revised 2026-09-11 following the owner's frontend review. Use React with TypeScript and Vite for the operator console. The concrete use cases are concurrent run updates, exclusive ownership transitions, intervention controls, an event timeline, and forms whose focus and draft values must survive polling. Components render; hooks orchestrate client state; a typed service performs HTTP I/O. Vite builds static assets served by the existing local HTTP server. Keep provider and automation dependencies outside the client graph. [React application guidance](https://react.dev/learn/build-a-react-app-from-scratch), [Vite backend integration](https://vite.dev/guide/backend-integration).

The console has no search-indexing, server-rendering or server-component requirement, so Next.js adds a second server lifecycle without solving a current need. React with Vite is the chosen client stack, not a claim that one framework is best for every application. Begin with local React state and purpose-built CSS following the reviewed visual direction. Add dependencies only for demonstrated behavior.

React's safe text rendering reduces accidental HTML injection when used correctly. It does not supply authorization, CSRF protection, isolation or a trusted client. The server authenticates and validates every command, enforces ownership epochs and policy, and supplies restrictive response headers. Client controls reflect server authority. Secrets never enter Vite environment variables or browser bundles. The deliberately legacy bank simulator retains server-rendered HTML, generated control IDs and iframe navigation to exercise the assignment's compatibility requirements.

Validation at P7 covers a production asset build, accessible keyboard operation, preserved form state during live updates, unauthorized commands, stale ownership, and the complete operator flow in a real browser.

Yarn's immutable install checks that dependency resolution does not alter the lockfile. The native Node test runner covers contracts/state transitions; Playwright Test covers real-browser workflows. Formatting/linting tooling is introduced in bootstrap with exact versions. [Yarn install](https://yarnpkg.com/cli/install), [Node test runner](https://nodejs.org/docs/latest-v24.x/api/test.html).

No database is needed for a local capability and sanitized journal. Atomic files and a bounded writer satisfy the local lifecycle. Production metadata, leases and tenant authorization require durable services, as specified in the scale plan.

## Change log

### D10. Implement only the expressions the two workflows use

The first executable contract uses input references for fill/select and declared output references for reads. It does not include unused literal-value actions, output-to-input chaining, arbitrary route navigation or nested condition expressions. Conditions are bounded lists of conjunctions. Known recovery handlers can only click one reviewed dismiss control once. This is a narrower implementation of D04, preserving the required capability contract while reducing executable semantics. Navigation enters through the registered entry point; unsupported cases are rejected rather than stored as placeholders.

P2 validation covers unknown fields/versions/actions, reference integrity, repeated outputs, parameter typing, safe money parsing and exclusive control races. The JSON Schema is generated from the runtime source and checked for drift.

| Date | Decision | State |
| --- | --- | --- |
| 2026-09-11 | D01-D09 recorded | Implemented and checked through P9; production limitations remain explicit |
| 2026-09-11 | D05 revised: discovery model changed to `gpt-6-astra` on owner instruction; task-specific benchmark rationale and Claude Opus 5 fallback ladder recorded | P6 validates Astra at `low`; P10 source audit corrects the Opus score attribution; fallback not exercised |

| 2026-09-11 | P10 evidence export | Two final live discoveries, revision 4 approvals, keyless replay, owner exercise, exceptional outcomes, 100-session stability and source integrity checks documented |

When evidence changes a decision, add a dated entry explaining the trigger, replacement, validation and effect on prior artifacts. Keep the final design coherent rather than accumulating incompatible alternatives.

## D11. Accept explicit intent within a reviewed task contract

The final PDF audit exposed a missing public goal/target input. Discovery now accepts the caller's natural-language instruction and the registered `northstar` application entry point through the console and bounded JSON stdin. Separate typed parameters hold invocation values. The existing workflow selection supplies independently trusted output, checkpoint and action constraints, not a scripted action sequence. The model evaluates whether it can satisfy the goal within those constraints and returns `unsupported` otherwise. No task text can authorize an irreversible effect or change network policy.

Public goals use a deliberately narrow English text format, at most 500 characters. Known sensitive arguments become references, common credential/address shapes and unknown references are rejected, and goals stay out of artifacts and journals. This is a synthetic-application invocation policy, not generic PII detection. Tests verify caller text reaches the SDK request, mobile edits survive polling, unsupported goals cannot be approved, and unsafe inputs stop before browser/provider startup. Final live evidence at `c7d617c` verifies both caller goals, different-input replays and an unsupported request. Prompt version 2 identifies the expanded instruction contract; version 1 artifacts remain replayable.

Failure results now carry safe expected conditions, output type/parser and observed structural state beside the existing code, step and effect state. This closes the audit's diagnostic weakness without persisting raw DOM or invalid financial values.

The 2026-09-11 post-audit export supersedes the revision 4 release evidence with revision 5 capabilities and prompt version 2. Prior captures and failed attempts retain their original source identities. The final requirement audit and presentation commands are reconciled with the new evidence.
