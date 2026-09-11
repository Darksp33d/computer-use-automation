# Audit against the assignment

Final runtime reviewed: `c7d617cef632b3d4197e6ac4fa968ce0ddbcd646`. All ten PDF pages were re-read and reconciled with source, public interfaces, actual provider runs, automated checks and exported evidence. All seven core requirements have passing implementation or design evidence within the supported scope. This supersedes the open findings recorded against `99e372c`.

## Corrections made

The previous public discovery interface selected a predefined task contract without accepting the caller's goal and target. `DiscoveryIntent` now requires both. The console and JSON-stdin CLI send the prepared goal to the actual provider, with typed invocation values kept separate. The registered `northstar` application supplies its reviewed entry point. The selected workflow independently constrains outputs, success and authority; the model chooses the action sequence. Unsupported goals stop with `GOAL_UNSUPPORTED` and cannot be approved.

The correction is verified at the input boundary, SDK request body and mobile console. Final live evidence includes two user-editable goals and a real unsupported-goal rejection before any action. A separate actual CLI goal starts with B1002 and replays its generated artifact with A1001. These are real provider executions, distinct from the labeled fixtures used by ordinary tests.

Failure results previously split expected and observed context across the artifact and structural snapshot. They now include safe expected conditions/output parser and observed screen/state beside the code, step and effect state. The malformed-balance CLI test and final captured failure verify that contract without persisting the invalid value.

Artifact review also caught the expanded prompt still marked version 1. That capture was stopped before approval and preserved. New discoveries record version 2; existing version 1 capabilities remain compatible.

## Requirement assessment

| PDF requirement | Implementation and evidence | Result |
| --- | --- | --- |
| 3.1 Goal-driven loop, page 3 | Explicit goal/target input in console and CLI; live bounded observe/decide/act; two final real discoveries and unsupported-goal rejection. [Capture inputs and run IDs](../evidence/capture.json), [CLI invocation](../evidence/verification/cli-goal/invocation.json). | Met for the registered application and reviewed task contracts |
| 3.2 Structured artifact, pages 3-4 | Strict versioned schema, semantic validation, typed inputs/outputs, logical targets and rationale, actual successful steps, checkpoints and immutable approvals. [Revision 5 artifacts](../evidence/README.md#reviewed-capabilities). | Met |
| 3.3 Replay, page 4 | Provider-free interpreter and denied-provider subprocess test; unique targeting, identity/output checks, business outcomes, bounded recovery and explicit failure diagnostics. Both final capabilities replay with different inputs. | Met |
| 3.4 Guardrails, page 4 | Reviewed binding configures origin/route/method and action allowlists. Policy blocks unknown and irreversible effects. Input references, sanitized journals, native image masks and unknown-image omission protect supported records. Receiver-side browser probes and independent container egress checks pass. | Met within the documented synthetic target and containment scope |
| 3.5 Evidence, page 5 | Ordered actor/action/reason-code events, actual provider response IDs and usage, discovery/replay journals, safe structural failure snapshots and inspected screenshots. [Run index](../evidence/README.md#final-runs). | Met; concise reason codes replace unrestricted model rationale |
| 3.6 Handoff, page 5 | Same browser/page, serialized ownership epochs, mediated manual controls, verified resume, expiry/cancellation and actor events. Final scripted capture and the owner's confirmed development exercise are distinguished. | Met for supported interventions |
| 3.7 Heterogeneity/reuse, pages 5-6 | Surface interface separates observation/action from interpretation; legacy iframe/table binding is implemented. Desktop mapping, vendor/tenant specialization, drift, durable ownership and capacity are addressed in [the design](scale.md). | Meets the design requirement; distributed tenancy and desktop are not implemented |
| Section 6 deliverables, pages 7-8 | README setup, real goal invocation and automatic different-input replay; REPORT with seven exact headings; genuine artifact/discovery/replay/failure evidence and recording. | Complete |
| Repository publication/submission, pages 1 and 10 | Existing personal GitHub repository remains private on explicit owner instruction. No submission email has been sent. | Owner action before submission |

## Release checks

The full suite passes 23 unit and 62 browser tests, without retry-to-green behavior. A clean GitHub checkout passes immutable install, browser setup, doctor and the full suite without a provider key. Linux CI [34651378928](https://github.com/Darksp33d/computer-use-automation/actions/runs/34651378928) passes verification and containment. Keyless console startup and SIGINT cleanup pass. Seventeen exported screenshots were inspected, and the recording was decoded and sampled.

The evidence verifier checks file hashes, the exact runtime source snapshot, journal sequence/results, real-provider metadata, provider-free replay, rejection before action, diagnostic context and approval/validation links. `corepack yarn verify:evidence --current` additionally requires this checkout's runtime to match the capture. [Verification details](verification.md).

## Scope and confidence

The PDF permits one concrete surface and a design for desktop/multi-tenant support. Groove implements that scope. Arbitrary websites, real bank access, irreversible transactions and a deployed million-session service are outside it. Local approval files are not a protected signing authority. Public goal validation is a narrow synthetic-input policy, not generic PII detection.

The 100/100 stability sample uses two concurrent sessions on one development machine. It establishes tested local behavior, not a production availability target. No review can prove perfection. The supported assignment flow is complete, reproducible and backed by inspectable evidence; the deployment prerequisites remain explicit in the report and scale design.
