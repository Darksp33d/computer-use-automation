# Groove evidence

This export uses fictional Northstar records only. The final capture succeeded at source `67c40003f3c822d7a916bb64ebd9c73c007aa1db`, from 2026-09-11T18:47:44.595Z to 2026-09-11T18:50:50.988Z. Node v24.15.0, Chromium 153.0.8010.12, GPT-6 Astra at low effort. The fixture and operator source are included in the runtime digests.

[Watch the continuous walkthrough](walkthrough.webm). The development agent operates the console and pauses to review both complete JSON contracts before approval. This is an agent-operated recording, not an independent human recording. The launch credential and provider key are absent from the recorded page.

## Final runs

| Exercise | Result | Journal | Output |
| --- | --- | --- | --- |
| savings / discovery / normal | success | [58a9c731](runs/58a9c731-56a9-4937-b2ce-64745e30961a/events.jsonl) | [result](runs/58a9c731-56a9-4937-b2ce-64745e30961a/result.json) |
| savings / fresh validation with different inputs | success | [497d0145](runs/497d0145-fcda-4aaa-a07b-0d207da698dc/events.jsonl) | [result](runs/497d0145-fcda-4aaa-a07b-0d207da698dc/result.json) |
| review / discovery / normal | success | [21b33994](runs/21b33994-3baa-479b-8bec-993ad242c882/events.jsonl) | [result](runs/21b33994-3baa-479b-8bec-993ad242c882/result.json) |
| review / fresh validation with different inputs | success | [cbd6fbd8](runs/cbd6fbd8-5bab-4d03-8a4f-8f52d75b0b37/events.jsonl) | [result](runs/cbd6fbd8-5bab-4d03-8a4f-8f52d75b0b37/result.json) |
| savings / replay / normal | success | [b1c02eef](runs/b1c02eef-4061-4ff8-82ab-d39e8b748361/events.jsonl) | [result](runs/b1c02eef-4061-4ff8-82ab-d39e8b748361/result.json) |
| review / replay / normal | success | [c5fb0b65](runs/c5fb0b65-d246-43eb-b230-5717243a039e/events.jsonl) | [result](runs/c5fb0b65-d246-43eb-b230-5717243a039e/result.json) |
| savings / replay / not-found | MEMBER_NOT_FOUND | [6f5e8e6d](runs/6f5e8e6d-9532-4af5-b7ec-ef755b4d03be/events.jsonl) | [result](runs/6f5e8e6d-9532-4af5-b7ec-ef755b4d03be/result.json) |
| savings / replay / malformed-balance | OUTPUT_INVALID | [4648ac99](runs/4648ac99-6c61-4482-8136-41310fc431a2/events.jsonl) | [result](runs/4648ac99-6c61-4482-8136-41310fc431a2/result.json) |
| savings / replay / intervention | success | [75e459d7](runs/75e459d7-5304-418b-b0ff-71485992fd8f/events.jsonl) | [result](runs/75e459d7-5304-418b-b0ff-71485992fd8f/result.json) |

Savings discovery used eight model decisions and seven executed steps; account review used nine decisions and eight steps. Provider response IDs and token usage remain in the sanitized journals. Each replay has zero model-decision events. The capture deletes the provider credential before its replay cases. Separate CLI tests deny provider fetches and the dependency check rejects provider imports from replay.

The second member’s savings balance was verified as 823010 USD minor units. That fictional value appears in the console recording; persisted results redact it. Account review verifies member, account type and nickname and stops before the forbidden account-opening action.

## Reviewed capabilities

- [read-savings-balance, revision 4](artifacts/read-savings-balance-4.json), with its [approval](artifacts/read-savings-balance-4.approval.json). The bytes match the application catalog.
- [prepare-sub-account, revision 4](artifacts/prepare-sub-account-4.json), with its [approval](artifacts/prepare-sub-account-4.approval.json). The bytes match the application catalog.

## Visual and failure evidence

- [handoff claimed](screenshots/handoff-claimed.png)
- [handoff completed](screenshots/handoff-completed.png)
- [handoff paused](screenshots/handoff-paused.png)
- [malformed balance](screenshots/malformed-balance.png)
- [member not found](screenshots/member-not-found.png)
- [mobile session dialog](screenshots/mobile-session-dialog.png)
- [review contract review](screenshots/review-contract-review.png)
- [review discovery](screenshots/review-discovery.png)
- [review replay](screenshots/review-replay.png)
- [savings contract review](screenshots/savings-contract-review.png)
- [savings discovery](screenshots/savings-discovery.png)
- [savings replay](screenshots/savings-replay.png)
- [sessions](screenshots/sessions.png)

The [malformed-balance structural snapshot](runs/4648ac99-6c61-4482-8136-41310fc431a2/structure.json) retains safe screen and target context without the invalid value. Native opaque masks protect known sensitive regions. Unknown visual content causes image omission. Masks may also cover part of a modal layered over a sensitive region; mediated controls remain available.

## Verification and source identity

[Stability measurements](verification/stability.json): 100/100 fresh sessions, no retries, two concurrent runs, alternating members. Median 1088.15 ms, p95 1153.73 ms, maximum 1545.56 ms on an Apple M5 Pro with 24 GiB memory. Latency includes browser startup and replay, excludes cleanup. This exercise uses approved revision 1; revision 4 reuse is demonstrated separately above. The sample establishes local stability only.

[Containment results](verification/containment.json): non-root read-only browser and target workers, independent external receiver unchanged, successful contained replay. Both checks ran at `bba5b6e`; runtime source is identical to the final capture. The capture helper changed afterward to synchronize screenshots; approved catalog revisions and release documentation were added.

[Release checks](verification/checks.json) record immutable clean-checkout installation, automated tests, Linux CI and dependency audit. The report has all seven required sections and fits three pages in a 10-point US Letter rendering.

Run `corepack yarn verify:evidence` from the repository root. [manifest.json](manifest.json) covers every exported file, the runtime source and fixture files. The verifier checks hashes, journal sequence/terminal results, provider decision presence or absence, validation links and identical artifact copies. Digests establish identity, not independent cryptographic proof of provenance or protected approval authority.

## Preserved development history

- [Owner handoff journal](development/owner-handoff/events.jsonl) and [result](development/owner-handoff/result.json): run `b6e31893-3921-487c-a5cb-2c3da9477e13`, started at 17:30:03 UTC on September 11. The owner claimed control, acknowledged the notice and resumed, then explicitly confirmed “Completed successfully” in the development conversation. This was source `5a691c7` with P7 work in progress. It is a real owner exercise, not final-source footage. Pre-fix images are excluded.
- [First discovery failure](development/first-discovery-failure/result.json) and [journal](development/first-discovery-failure/events.jsonl): a genuine development attempt stopped at a checkpoint before dispatch. This preceded the legacy cell-input targeting correction. Its worktree was under development; it is not final runtime evidence.
- [Initial capture](development/initial-capture/capture.json): both discoveries and all replay cases succeeded at `bba5b6e`, producing revision 3. Journals are retained. Some console screenshots preceded the next image poll and showed stale frames, so those images and that video are excluded from this export.
- [Capture verification failure](development/capture-verification-failure/capture.json): savings discovery and fresh validation succeeded at `ef7cf63`, but the screenshot helper attempted a blob fetch that the console CSP correctly blocked. The candidate was not approved. The harness now waits for a new image response and decoded image without relaxing CSP. The failed attempt’s journals are retained.

No failed run has been relabeled as a success. Test providers and automated operator commands are explicitly separate from live model execution and the owner’s exercise. All original private runtime records remain under ignored local storage.
