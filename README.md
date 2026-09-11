# Computer-Use Automation System

Learn a workflow by operating a real UI. Save it as a typed capability. Replay it without an LLM. Transfer the same live session to an operator when automation cannot proceed safely.

**Current status: implementation in progress. P1-P5 are verified: typed contracts, legacy simulator, policy-checked browser sessions and model-free replay. P6 discovery is in development; the React operator console and final evidence are still pending.**

This repository is being built for the interface.ai computer-use assignment. Development is private. It uses a fictional local banking application and synthetic data; no access to a real banking system is needed.

## Start here

Read [PLAN.md](PLAN.md) for the complete implementation sequence, understandable use cases, chosen stack, commit gates, and completion checklist.

| Document | Purpose |
| --- | --- |
| [Change log](CHANGELOG.md) | Verified milestones and material decisions |
| [Implementation plan](PLAN.md) | What will be built, in what order, and how each stage is accepted |
| [Design contract](docs/design.md) | Capability schema, discovery, replay, targeting and human control |
| [Verification and threats](docs/verification.md) | Observable acceptance tests, security boundaries and evidence requirements |
| [Scale and operations](docs/scale.md) | Multi-tenant reuse, millions-of-users capacity model and deployment prerequisites |
| [Decisions and sources](docs/decisions.md) | Technology rationale, rejected alternatives and primary references |
| [Assignment report](REPORT.md) | Current implementation and planned work in the assignment's seven required sections |

## Planned setup and demo

The implementation will support Node.js 24 LTS and Yarn 4, with a pinned Playwright Chromium build. The default local demonstration will replay an included capability without a model key. Fresh discovery will use a privately configured `OPENAI_API_KEY`.

Tooling available now:

```bash
corepack yarn install --immutable
corepack yarn setup
corepack yarn doctor
corepack yarn check
```

Run `corepack yarn target` to inspect the legacy banking UI at http://127.0.0.1:4174. Browser tests currently exercise parameterized replay and exceptional outcomes. The experimental `corepack yarn discover savings` command uses a privately configured key, attempts genuine discovery and, on success, replays the artifact with another synthetic member. Discovery has not passed its stage gate yet. No current file should be mistaken for a successful discovery recording. See [the visual direction](docs/visual-direction.md) for the Dribbble references reviewed before interface implementation.

## Working agreement

Each change is a focused, tested commit. Runtime safety and reproducibility take precedence over feature breadth. The project will state measured results and deployment limits explicitly. See [AGENTS.md](AGENTS.md) for implementation rules.
