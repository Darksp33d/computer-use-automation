# Audit against the assignment

Reviewed source: `99e372cb590f4fab4f928a110c0ed22fa9fb4d3e`. This is a fresh review against all ten pages of the supplied assignment, followed by source inspection and the aggregate checks. It supersedes the earlier unconditional completion statement. Test success establishes the tested behavior, not completeness against the brief.

## Finding requiring correction

**Section 3.1, page 3: the public discovery interface does not accept a caller-supplied natural-language goal and target.**

`src/cli/discover.ts` accepts only `savings` or `review`, constructs fixed inputs and starts its own target. `src/operator/contracts.ts` likewise defines workflow, mode, scenario and inputs, with no goal or target input. `src/services/session.ts` creates the discovery contract from the selected entry in `taskContracts`. The provider receives that contract's fixed natural-language description.

The model really does choose and execute the steps. The saved artifacts and provider evidence are genuine. However, selecting one of two predefined task contracts is narrower than the PDF's explicit caller-input requirement. The existing tests verify those two workflows; they cannot establish a missing goal/target interface. Treat this as an open compliance gap, not an optional stretch goal or a reason to replace the working engine.

Correction should add an explicit discovery invocation contract containing a natural-language goal, the approved target binding/entry point and separate typed arguments. Preserve independently trusted output/success constraints and action policy. Goal text must not become executable policy, be copied into artifacts/logs, or silently replace the declared task contract. Define the supported goal scope and reject unsupported requests clearly. Add boundary and provider-view tests, then capture a genuine run submitted through this interface and its parameterized replay. A text field whose value never reaches the discovery decision is insufficient.

## Requirement assessment

| PDF requirement | Actual implementation and evidence | Assessment |
| --- | --- | --- |
| 3.1 Goal-driven loop, page 3 | `discover.ts` performs live observe/decide/act, bounded decisions and verified completion. Two live provider runs are exported. Caller goal/target input is absent. | Partially met; correction above is required |
| 3.2 Structured artifact, pages 3-4 | Strict schema, semantic reference validation, typed inputs, deterministic output parsers, logical targets with rationale, conditions, immutable revisions and execution-derived steps. Revision 4 artifacts and approval digests are exported. | Met for the implemented browser binding |
| 3.3 Replay, page 4 | Provider-free interpreter, dependency boundary check and denied-provider CLI test. Subject/type/output checks, named business outcomes, bounded recovery and uncertain-effect handling have browser coverage. | Met for the supported workflows; diagnostic caveat below |
| 3.4 Guardrails, page 4 | Trusted target/action map, exact origin/route/method policy, irreversible action denial, input references, sanitized observations/journals and native image masks. Independent container egress proof supplements browser interception. | Met within the documented synthetic target and containment scope |
| 3.5 Evidence, page 5 | Live provider IDs and usage, ordered actor/action events, discovery/replay journals, safe structural failure snapshots and inspected images. Failed development attempts are retained separately. | Met; structured reason codes are deliberately concise |
| 3.6 Handoff, page 5 | Serialized ownership epochs, same browser/page, mediated manual controls, verified resume, expiry/cancellation and recorded actor events. Scripted checks and the owner's confirmed development exercise are distinguished. | Met for the supported live-session interventions |
| 3.7 Heterogeneity/reuse, pages 5-6 | Surface interface separates observation/action from interpretation. Legacy iframe/table binding is implemented. Desktop mapping, vendor/tenant specialization, drift, ownership and capacity are documented. | Meets the design requirement; desktop and distributed tenancy are not implemented |
| Section 6 deliverables, pages 7-8 | README, REPORT with seven exact headings, actual artifacts and discovery/replay/failure evidence, recording and reproducible commands. | Present; the goal-command example must be revised with the 3.1 correction |
| Public repository/submission, pages 1 and 10 | Repository is private on explicit owner instruction; no email sent. | Pending owner publication/submission, not an implementation defect |

## Diagnostic caveat

The failure result contains `code`, `stepId` and effect state. Expected conditions and observed state are split between the saved artifact and `structure.json`, rather than carried together in the caller's result. For example, the exported malformed-balance result identifies `OUTPUT_INVALID` at step 5; its artifact identifies the USD minor-unit parser and its snapshot identifies the savings screen without persisting the invalid value. This is debuggable locally, but an explicit safe diagnostic reference or summary would make the page 4 caller contract stronger. Do not add raw values or raw DOM to address this.

## Scope and confidence

The PDF expressly permits one concrete surface and a design for desktop/multi-tenant support. It does not require a hosted million-session service, arbitrary website onboarding, another frontend framework, or every optional stretch goal. Those should not be confused with the actual 3.1 gap.

The 100/100 stability result is a small local sample at concurrency two. Model discoveries use two task contracts against one synthetic application. Image privacy is verified for the reviewed binding and canaries, not every hostile page. Local approval files are not a protected signing authority. These limits remain material even when every automated test passes.

The reviewed system is a substantial working solution. It should not receive unconditional assignment-complete sign-off until the goal/target input gap has been corrected and evidenced. No finite review can prove perfection or that this is the best possible solution.
