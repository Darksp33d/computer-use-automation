# Groove: Computer-Use Automation

Discover a workflow by operating a real UI. Save the successful path as a typed capability. Replay it without a model. When automation encounters a blocker, an operator can take control of the same live session and return it after checkpoint verification.

**Current status: core discovery and replay are verified. The React operator workspace and same-session handoff pass browser tests. The optional container profile passes independent egress verification. Remaining lifecycle checks and final submission evidence are still in progress.**

Groove uses a fictional Northstar banking application and synthetic records. Development remains private. This is a complete local execution architecture under active verification, not a claim of deployed enterprise scale.

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
corepack yarn discover savings
corepack yarn discover review
```

The CLI learns from live masked observations and replays a successful artifact with different inputs. It prints sanitized results and writes the draft and journal under `.local/runs/<run-id>/`. The console additionally validates a fresh replay before offering a capability review and approval. Approval pins the exact artifact bytes and application binding; a draft cannot approve itself.

The current discovery model is GPT-6 Astra at low reasoning effort. Discovery is bounded by action, time, request, token and estimated-cost admission limits. Replay neither imports nor calls the provider adapter. Provider failure never silently substitutes a scripted workflow.

## Verification

```bash
corepack yarn doctor
corepack yarn check
```

The aggregate check builds the server and production React assets, checks strict TypeScript and formatting, runs unit tests, verifies schema generation, and exercises real Chromium workflows. Browser coverage includes deterministic replay, typed outcomes, genuine compiler semantics using labeled test providers, same-session operator handoff, authorization, mobile form persistence, keyboard access, and an axe accessibility audit. Tests have no retry-to-green setting.

The included capability revisions currently originate from genuine development discovery runs. Their review metadata explicitly identifies an engineering review. Final submission evidence will be regenerated from committed runtime code and documented separately; scripted tests are never presented as live model or human recordings.

## Boundaries

- The local controller admits two active runs and retains at most 50 run summaries. Each run owns a separate browser context and target session. This is not a multi-tenant hosted service.
- Browser actions and network requests are checked against the reviewed binding. Unknown effects and final account creation are denied for automation and operators.
- Sensitive output can be displayed to the authenticated local operator and returned to an authorized caller. Persisted evidence redacts sensitive output. Browser observations and screenshots omit sensitive runtime values.
- Ownership uses serialized commands and epochs. An expired operator lease leaves the run paused; an expired intervention ends it. A lost browser cannot be reconstructed as the same live session.
- Runtime files are local and ignored by Git. A browser request allowlist is an application guardrail, not a substitute for network isolation. The containment profile and final adversarial checks are still being completed.

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
| [Assignment report](REPORT.md) | The assignment's seven required sections |

Each implementation stage is a focused, verified commit. See [AGENTS.md](AGENTS.md) for the repository's engineering rules.

## Optional containment verification

With Docker running, use `corepack yarn build` followed by `node scripts/verify-containment.mjs`. The script creates and tears down its own isolated project, verifies a real replay and proves that an external request receiver cannot be reached by either worker. See the [verified profile and limits](docs/containment.md).
