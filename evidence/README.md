# Groove evidence

This export uses fictional Northstar records only. The final capture succeeded at source `c7d617cef632b3d4197e6ac4fa968ce0ddbcd646`, from 2026-09-11T21:51:34.626Z to 2026-09-11T21:54:49.880Z. Node v24.15.0, Chromium 153.0.8010.12, GPT-6 Astra at low effort. The fixture and operator source are included in the runtime digests.

[Watch the continuous walkthrough](walkthrough.webm). The development agent operates the console and pauses to review both complete JSON contracts before approval. This is an agent-operated recording, not an independent human recording. The launch credential and provider key are absent from the recorded page.

## Final runs

| Exercise | Result | Journal | Output |
| --- | --- | --- | --- |
| savings / discovery / normal | success | [db4d1a4c](runs/db4d1a4c-fce1-4ad4-bf73-d90a51fc4ff7/events.jsonl) | [result](runs/db4d1a4c-fce1-4ad4-bf73-d90a51fc4ff7/result.json) |
| savings / fresh validation with different inputs | success | [3d19dcf8](runs/3d19dcf8-d60a-4045-82a0-fffd455323b9/events.jsonl) | [result](runs/3d19dcf8-d60a-4045-82a0-fffd455323b9/result.json) |
| review / discovery / normal | success | [f11a666c](runs/f11a666c-67c3-40ea-9be0-0cdb660c4850/events.jsonl) | [result](runs/f11a666c-67c3-40ea-9be0-0cdb660c4850/result.json) |
| review / fresh validation with different inputs | success | [3a1e1f83](runs/3a1e1f83-99bd-4e23-81e8-eaa928d66be6/events.jsonl) | [result](runs/3a1e1f83-99bd-4e23-81e8-eaa928d66be6/result.json) |
| savings / discovery / normal | GOAL_UNSUPPORTED | [1aac9e74](runs/1aac9e74-6055-4c1b-afed-8bd54a94c42d/events.jsonl) | [result](runs/1aac9e74-6055-4c1b-afed-8bd54a94c42d/result.json) |
| savings / replay / normal | success | [84d474e3](runs/84d474e3-8c4b-440a-98fb-2041f742edf6/events.jsonl) | [result](runs/84d474e3-8c4b-440a-98fb-2041f742edf6/result.json) |
| review / replay / normal | success | [2ab17a57](runs/2ab17a57-dbd9-4dfa-9f03-d776dfbbeaa9/events.jsonl) | [result](runs/2ab17a57-dbd9-4dfa-9f03-d776dfbbeaa9/result.json) |
| savings / replay / not-found | MEMBER_NOT_FOUND | [d034c97b](runs/d034c97b-600a-4a19-9d8a-6d1399fdd60c/events.jsonl) | [result](runs/d034c97b-600a-4a19-9d8a-6d1399fdd60c/result.json) |
| savings / replay / malformed-balance | OUTPUT_INVALID | [f5a3f8cc](runs/f5a3f8cc-dba4-4836-b786-b322b67b4414/events.jsonl) | [result](runs/f5a3f8cc-dba4-4836-b786-b322b67b4414/result.json) |
| savings / replay / intervention | success | [3df29349](runs/3df29349-49b5-4715-baee-0246e8f60334/events.jsonl) | [result](runs/3df29349-49b5-4715-baee-0246e8f60334/result.json) |

Savings discovery used eight model decisions and seven executed steps; account review used nine decisions and eight steps. Provider response IDs and token usage remain in the sanitized journals. Each replay has zero model-decision events. The capture deletes the provider credential before its replay cases. Separate CLI tests deny provider fetches and the dependency check rejects provider imports from replay.

The second member’s savings balance was verified as 823010 USD minor units. That fictional value appears in the console recording; persisted results redact it. Account review verifies member, account type and nickname and stops before the forbidden account-opening action.

## Reviewed capabilities

- [read-savings-balance, revision 5](artifacts/read-savings-balance-5.json), with its [approval](artifacts/read-savings-balance-5.approval.json). The bytes match the application catalog.
- [prepare-sub-account, revision 5](artifacts/prepare-sub-account-5.json), with its [approval](artifacts/prepare-sub-account-5.approval.json). The bytes match the application catalog.

## Visual and failure evidence

- [handoff claimed](screenshots/handoff-claimed.png)
- [handoff completed](screenshots/handoff-completed.png)
- [handoff paused](screenshots/handoff-paused.png)
- [malformed balance](screenshots/malformed-balance.png)
- [member not found](screenshots/member-not-found.png)
- [mobile session dialog](screenshots/mobile-session-dialog.png)
- [review contract review](screenshots/review-contract-review.png)
- [review discovery](screenshots/review-discovery.png)
- [review goal](screenshots/review-goal.png)
- [review replay](screenshots/review-replay.png)
- [savings contract review](screenshots/savings-contract-review.png)
- [savings discovery](screenshots/savings-discovery.png)
- [savings goal](screenshots/savings-goal.png)
- [savings replay](screenshots/savings-replay.png)
- [savings unsupported goal](screenshots/savings-unsupported-goal.png)
- [sessions](screenshots/sessions.png)
- [unsupported goal](screenshots/unsupported-goal.png)

The [malformed-balance structural snapshot](runs/f5a3f8cc-dba4-4836-b786-b322b67b4414/structure.json) retains safe screen and target context without the invalid value. Native opaque masks protect known sensitive regions. Unknown visual content causes image omission. Masks may also cover part of a modal layered over a sensitive region; mediated controls remain available.

## Verification and source identity

[Stability measurements](verification/stability.json): 100/100 fresh sessions, no retries, two concurrent runs, alternating members. Median 1050.29 ms, p95 1359.47 ms, maximum 1434.34 ms on an Apple M5 Pro with 24 GiB memory. Latency includes browser startup and replay, excludes cleanup. This exercise uses approved revision 1; revision 5 reuse is demonstrated separately above. The sample establishes local stability only.

[Containment results](verification/containment.json): non-root read-only browser and target workers, independent external receiver unchanged, successful contained replay. Both checks ran at `11a8225`. Live capture and containment were active during stability measurement, so this is not an isolated benchmark. The subsequent runtime change at `c7d617c` versions prompt provenance and preserves old artifact compatibility; full-suite, clean-checkout and Linux containment checks pass at that revision.

[Release checks](verification/checks.json) record immutable clean-checkout installation, automated tests, Linux CI and dependency audit. The report has all seven required sections and fits three pages in a 10-point US Letter rendering.

Run `corepack yarn verify:evidence --current` from the repository root. [manifest.json](manifest.json) covers every exported file, the runtime source snapshot and fixture files. The --current release gate also rejects any runtime difference from the checkout. The verifier checks hashes, journal sequence/terminal results, provider decision presence or absence, validation links and identical artifact copies. Digests establish identity, not independent cryptographic proof of provenance or protected approval authority.

## Caller-goal verification

The final [capture inputs](capture.json) include explicit public goals and the registered Northstar target. Both approved artifacts use prompt version 2. A real unsupported request stops with GOAL_UNSUPPORTED before action. Goals are deliberately supplied synthetic public instructions in the capture harness; runtime journals and artifacts do not preserve goal text.

A separate [JSON-stdin CLI invocation](verification/cli-goal/invocation.json) at the same source discovers with B1002 and automatically replays with A1001. Its [discovery journal](verification/cli-goal/discovery/events.jsonl), [draft artifact](verification/cli-goal/capability.json) and [replay journal](verification/cli-goal/replay/events.jsonl) are retained. The CLI draft was not approved or inserted into the catalog.

## Preserved development history

- [Pre-goal capture](development/pre-goal-capture/capture.json): the earlier revision 4 release with its original journals remains identifiable.
- [Prompt-version review](development/prompt-version-review/capture.json): the first explicit-goal discovery and validation succeeded at `11a8225`. Review caught the old prompt-version label, so the agent canceled capture before approval. This preserved attempt is not relabeled as a failure of goal execution.
- [Owner handoff journal](development/owner-handoff/events.jsonl) and [result](development/owner-handoff/result.json): run `b6e31893-3921-487c-a5cb-2c3da9477e13`, started at 17:30:03 UTC on September 11. The owner claimed control, acknowledged the notice and resumed, then explicitly confirmed “Completed successfully” in the development conversation. This was source `5a691c7` with P7 work in progress. It is a real owner exercise, not final-source footage. Pre-fix images are excluded.
- [First discovery failure](development/first-discovery-failure/result.json) and [journal](development/first-discovery-failure/events.jsonl): a genuine development attempt stopped at a checkpoint before dispatch. This preceded the legacy cell-input targeting correction. Its worktree was under development; it is not final runtime evidence.
- [Initial capture](development/initial-capture/capture.json): both discoveries and all replay cases succeeded at `bba5b6e`, producing revision 3. Journals are retained. Some console screenshots preceded the next image poll and showed stale frames, so those images and that video are excluded from this export.
- [Capture verification failure](development/capture-verification-failure/capture.json): savings discovery and fresh validation succeeded at `ef7cf63`, but the screenshot helper attempted a blob fetch that the console CSP correctly blocked. The candidate was not approved. The harness now waits for a new image response and decoded image without relaxing CSP. The failed attempt’s journals are retained.

No failed run has been relabeled as a success. Test providers and automated operator commands are explicitly separate from live model execution and the owner’s exercise. All original private runtime records remain under ignored local storage.
