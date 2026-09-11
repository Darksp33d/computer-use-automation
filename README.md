# Computer-Use Automation System

Learn a workflow by operating a real UI. Save it as a typed capability. Replay it without an LLM. Transfer the same live session to an operator when automation cannot proceed safely.

**Current status: planning baseline. Application code, executable demos and real discovery evidence have not been implemented yet.**

This repository is being built for the interface.ai computer-use assignment. Development is private. It uses a fictional local banking application and synthetic data; no access to a real banking system is needed.

## Start here

Read [PLAN.md](PLAN.md) for the complete implementation sequence, understandable use cases, chosen stack, commit gates, and completion checklist.

| Document | Purpose |
| --- | --- |
| [Implementation plan](PLAN.md) | What will be built, in what order, and how each stage is accepted |
| [Design contract](docs/design.md) | Capability schema, discovery, replay, targeting and human control |
| [Verification and threats](docs/verification.md) | Observable acceptance tests, security boundaries and evidence requirements |
| [Scale and operations](docs/scale.md) | Multi-tenant reuse, millions-of-users capacity model and deployment prerequisites |
| [Decisions and sources](docs/decisions.md) | Technology rationale, rejected alternatives and primary references |
| [Assignment report](REPORT.md) | Concise proposed design in the assignment's seven required sections |

## Planned setup and demo

The implementation will support Node.js 24 LTS and Yarn 4, with a pinned Playwright Chromium build. The default local demonstration will replay an included capability without a model key. Fresh discovery will use a privately configured `OPENAI_API_KEY`.

Exact runnable commands will be added and verified as the relevant stages pass. The intended command contract is documented in the plan. No current file should be mistaken for a successful discovery recording.

## Working agreement

Each change is a focused, tested commit. Runtime safety and reproducibility take precedence over feature breadth. The project will state measured results and deployment limits explicitly. See [AGENTS.md](AGENTS.md) for implementation rules.
