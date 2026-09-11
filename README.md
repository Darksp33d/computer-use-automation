# Groove: Computer-Use Automation

Discover a workflow by operating a real UI. Save the successful path as a typed capability. Replay it without a model. When automation encounters a blocker, an operator can take control of the same live session and return it after checkpoint verification.

**Implemented and verified:** genuine discovery for two workflows, provider-free replay, reviewed capabilities, same-session handoff, exceptional outcomes, a React operator console and optional container isolation. [Evidence and walkthrough](evidence/README.md).

Groove uses a fictional Northstar banking application and synthetic records. Development remains private. This is a verified local execution system. The production deployment prerequisites and capacity assumptions are explicit in the [scale design](docs/scale.md).

## Try it locally

Use Node.js 24 LTS and the repository's pinned Yarn 4 version:

```bash
corepack yarn install --immutable
corepack yarn setup
corepack yarn demo
```

Open the local launch link printed in the terminal. Its fragment contains an ephemeral console credential. The browser removes it from the address bar and keeps it in memory. Reopening the launch link reconnects after a refresh; do not share that link.

In the console:

1. Select **New session**, choose **Read savings balance**, and use **Replay** with the normal scenario. The included capability runs without an API key and returns typed output.
2. Start another replay with **Operator notice**. Choose **Take control**, **Acknowledge notice**, then **Verify & resume**. The operator commands act on the original browser session. The timeline distinguishes operator and automation actions.
3. Try **Member not found**, **Permission denied**, or **Malformed balance** to see distinct outcomes. **Prepare sub-account** stops at the review screen; final account creation is blocked.

The default console listens on loopback port 4173. Stop it with Ctrl+C. The standalone legacy target is available with `corepack yarn target` on port 4174. Console runs start their own isolated target instances.

## Invoke replay from another agent

Build once, then send a JSON argument object through stdin. This command starts an isolated synthetic target, loads an approved capability revision and writes exactly one JSON result to stdout:

```bash
corepack yarn build
node dist/src/cli/replay.js <<'JSON'
{"memberId":"B1002"}
JSON
```

Use `--capability prepare-sub-account --revision 1` with `memberId`, `accountType` and `nickname` inputs for account review. `--scenario not-found` exercises a known business outcome. The default capability is `read-savings-balance`, revision `1`. No provider key is loaded or needed.

Output is redacted by default. An authorized caller can pass `--show-sensitive` to receive the typed values in stdout; persisted results stay redacted. Treat that stdout as private. Inputs are limited to 16 KB and are never included in errors. The CLI accepts approved local catalog entries only.

Exit codes: `0` success, `2` business outcome, `3` failure or rejected invocation, `4` cancellation. A rejection before replay produces `{"status":"rejected","code":"INVALID_INPUT"}` or another safe failure code. Runtime results include a run ID and the status-specific fields defined in `src/contracts/runtime.ts`. An intervention requires the interactive console; unattended replay stops with the relevant failure code.

## Fresh discovery

Configure `OPENAI_API_KEY` privately in the ignored `.env.local` file. Never put a key in a capability, a client environment variable, or a commit. Then choose **Discover** in the console, or run:

```bash
corepack yarn discover --request <<'JSON'
{"workflow":"savings","target":"northstar","goal":"Find the available savings balance for {memberId}.","inputs":{"memberId":"A1001"}}
JSON
```

The CLI learns from live masked observations and replays a successful artifact with different inputs. It prints sanitized results and writes the draft and journal under `.local/runs/<run-id>/`. The console additionally validates a fresh replay before offering a capability review and approval. Approval pins the exact artifact bytes and application binding; a draft cannot approve itself.

The current discovery model is GPT-6 Astra at low reasoning effort. Discovery is bounded by action, time, request, token and estimated-cost admission limits. Replay neither imports nor calls the provider adapter. Provider failure never silently substitutes a scripted workflow.

## Verification

```bash
corepack yarn doctor
corepack yarn check
```

The aggregate check builds the server and production React assets, checks strict TypeScript and formatting, runs unit tests, verifies schema generation, and exercises real Chromium workflows. Browser coverage includes deterministic replay, typed outcomes, genuine compiler semantics using labeled test providers, same-session operator handoff, authorization, mobile form persistence, keyboard access, and an axe accessibility audit. Tests have no retry-to-green setting.

The aggregate suite passes 23 unit and 62 browser tests. A separate 100-session stability exercise passed 100/100 without retries at concurrency two. These are local measurements, not a production availability claim.

Revision 5 of each included capability comes from the final live-model capture and passed a fresh replay before explicit review approval. The console uses the latest approved revision; pass `--revision 5` to the calling-agent CLI to select it. Earlier revisions remain immutable. `corepack yarn verify:evidence --current` checks exported file hashes, run relationships and exact current runtime identity.

The final capture harness is `node --env-file-if-exists=.env.local scripts/capture-evidence.mjs` after a build and a clean commit. It performs real discovery through the console, pauses for complete artifact review, records provider-free replay and exceptional outcomes, and saves an agent-operated video and sanitized run files under `.local/submission/`. It never labels its scripted handoff as an independent human exercise. Review the export before tracking it.

## Boundaries

- The local controller admits two active runs and retains at most 50 run summaries. Each run owns a separate browser context and target session. This is not a multi-tenant hosted service.
- Browser actions and network requests are checked against the reviewed binding. Unknown effects and final account creation are denied for automation and operators.
- Sensitive output can be displayed to the authenticated local operator and returned to an authorized caller. Persisted evidence redacts sensitive output. Browser observations and screenshots omit sensitive runtime values.
- Ownership uses serialized commands and epochs. An expired operator lease leaves the run paused; an expired intervention ends it. A lost browser cannot be reconstructed as the same live session.
- Runtime files are local and ignored by Git. A browser request allowlist is an application guardrail, not a substitute for network isolation. The contained profile independently verifies worker egress denial on macOS Docker and Linux CI. Total local evidence retention remains manual.

## Project documents

| Document | Purpose |
| --- | --- |
| [Implementation plan](PLAN.md) | Requirements, ordered milestones and passed exit gates |
| [Change log](CHANGELOG.md) | Verified progress and material design changes |
| [Design contract](docs/design.md) | Capability semantics, trust boundaries and ownership |
| [Verification plan](docs/verification.md) | Acceptance scenarios, threats and evidence requirements |
| [Scale and operations](docs/scale.md) | Multi-tenant architecture and capacity assumptions |
| [Decisions and sources](docs/decisions.md) | Technology rationale and researched alternatives |
| [Visual direction](docs/visual-direction.md) | Dribbble references reviewed before UI implementation |
| [Evidence and recording](evidence/README.md) | Source-linked runs, reviewed artifacts, failure evidence and walkthrough |
| [Assignment report](REPORT.md) | The assignment's seven required sections |
| [Requirement audit](docs/assignment-audit.md) | Each assignment requirement mapped to its implementation, evidence and scope limits |

Each implementation stage is a focused, verified commit. See [AGENTS.md](AGENTS.md) for the repository's engineering rules.

## Optional containment verification

With Docker running, use `corepack yarn build` followed by `node scripts/verify-containment.mjs`. The script creates and tears down its own isolated project, verifies a real replay and proves that an external request receiver cannot be reached by either worker. See the [verified profile and limits](docs/containment.md).

### Discovery input scope

The console's **Discover** mode accepts an editable **Goal** and explicit **Target application**. The CLI's `--request` form accepts the same public task instruction and separate typed inputs. `northstar` identifies the reviewed application and its member-search entry point. Choose `savings` or `review` to supply independently reviewed output and success constraints; the model determines the action sequence. Unsupported goals return `GOAL_UNSUPPORTED` and cannot be approved.

Goals are public English task instructions, 10-500 characters, using letters, whitespace and basic punctuation. Refer to private inputs as `{memberId}` or `{nickname}`. Known sensitive argument values are replaced with references before the provider sees the goal; credential terms, number/address shapes and unknown references are rejected. These checks do not make arbitrary free text private. Do not include personal details or secrets. Goals are not copied into artifacts or journals. Arbitrary URLs and unreviewed applications are intentionally unsupported.
