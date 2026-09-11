# Presenting Groove

## Start here

Run `corepack yarn demo` and open the private loopback link printed in the terminal. Keep that launch credential out of shared notes. The included capabilities replay without an API key. Fresh discovery uses the privately configured OpenAI key; installation needs package and browser downloads.

Have [the report](../REPORT.md), [the capability](../evidence/artifacts/read-savings-balance-5.json) and [the recording](../evidence/walkthrough.webm) ready beside the console. The recording is genuine provider execution operated by the development agent. It is useful if the provider is unavailable during the presentation.

## Five-minute walkthrough

1. **Explain the boundary.** “The model discovers the path once. A reviewed artifact defines what another agent can invoke. Replay does not call the model.” Northstar is a synthetic legacy banking target with iframe navigation, nested tables and changing element IDs.
2. **Run a saved capability.** New session → Read savings balance → Replay → member B1002 → Normal flow. Show the verified $8,230.10 result and the timeline. Change to A1001 to demonstrate the same capability with different inputs and a $12,450.75 result.
3. **Show the contract.** Open the saved JSON. Point to typed `memberId`, integer minor-unit output, frame-scoped logical targets, actual recorded steps and member/account success checks. Show the separate approval record. Explain that a successful model statement is insufficient without those checks.
4. **Exercise two exceptional states.** Run Member not found to show a business outcome. Run Malformed balance to show a stopped execution with the step, expected parser and safe observed screen. No invalid financial value is copied into the journal.
5. **Transfer control.** Run Operator notice. Choose Take control → Acknowledge notice → Verify & resume. Show the same run ID, operator timeline events and resumed result. Explain ownership epochs, rejected stale commands and checkpoint verification.
6. **Show the write boundary.** Prepare sub-account → Replay reaches review. The final account-opening action is blocked by trusted policy for both automation and the operator.

## Live discovery, if time permits

New session → Discover. Set Target application to Northstar and edit Goal to “Find the available savings balance for {memberId}.” Use the normal scenario. Watch the model choose real actions; then inspect the successful capability and its fresh validation replay before approving it. A second member validates parameter reuse. Provider latency varies, so allow a few minutes.

A goal such as “Delete the member profile and all of its accounts.” is outside the supported contract and stops with `GOAL_UNSUPPORTED`. The selected workflow supplies trusted outputs and success conditions, not a predefined step sequence. Only this reviewed application is supported; arbitrary URLs do not acquire authority from goal text.

For a calling-agent demonstration, use the exact goal and replay commands in [README](../README.md). `--show-sensitive` explicitly returns the synthetic balance to stdout; persisted evidence remains redacted.

## Decisions to be ready to defend

| Question | Answer |
| --- | --- |
| Why a local synthetic app? | The brief permits it. It makes legacy markup, error states and forbidden effects reproducible without real bank access or PII. Automation still drives real Chromium UI. |
| Why TypeScript and Playwright? | Typed boundaries across the artifact, server and client; real browser actionability and frame-aware control resolution. The interpreter depends on a surface interface. |
| Why React and Vite? | The console needs persistent form state and live ownership updates. Static assets fit the existing control server. It has no server-rendering requirement that justifies another runtime. |
| What makes replay deterministic? | A saved action sequence, unique reviewed targets, bounded waits, typed extraction and verified checkpoints. Unknown effects stop rather than trigger blind retries. |
| Are retries safe? | A known dismissible notice has one reviewed recovery. A dispatched action with uncertain completion is re-observed; it is not blindly repeated. |
| Is the model trusted? | No. It cannot supply code, selectors or policy. Independent policy gates every action; raw sensitive inputs resolve privately from references. |
| Is it ready for millions of tenants? | The implementation verifies a local execution core. The scale design explains worker isolation, tenant identity, durable ownership, bounded queues, vendor limits and rollout. Those services are not claimed as deployed. |
| What does the evidence prove? | Actual provider decisions, generated artifacts, different-input replay, exceptional outcomes and same-session handoff. Local tests and 100 trials establish tested behavior, not universal correctness or a production SLO. |
| What would you build next? | Enforced isolated worker orchestration, tenant-bound identity/secrets, durable ownership and protected capability approvals, followed by measured vendor-specific capacity. |

## Submission

The repository remains private on the owner's instruction. The assignment requests a public GitHub link emailed from the applicant's address. Publication and sending that email are separate owner actions. Do not include `.env.local`, runtime directories or the console launch credential.
