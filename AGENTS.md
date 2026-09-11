# Repository guidance

Read PLAN.md and the relevant design section before implementing a stage. The workspace's engineering principles also apply. This is an independent repository; do not change sibling applications or copy their private code/data into this submission.

## Engineering

- Use TypeScript strict mode, Node.js 24 LTS, and Yarn 4. Pin exact tool versions during bootstrap.
- Keep the core interpreter independent of browser, provider, HTTP, and storage implementations. Depend only on the narrow interfaces it actually uses.
- UI code renders and forwards commands. Coordinators manage lifecycle. Drivers perform surface I/O. Policy decides authority. Schema modules define boundary contracts.
- Search the current module, other project modules and dependencies before introducing a helper or abstraction.
- No arbitrary code, selectors, shell commands or policy changes supplied by the model.
- No provider imports or calls in replay. No hidden simulator state in discovery/replay.
- Execute every action through policy and session ownership checks. No force clicks or first-match ambiguity suppression.
- Keep sensitive runtime values out of artifacts, exception messages, journal fields and model-bound observations unless explicitly permitted by a reviewed data policy.
- Implement only supported surface features. Do not add unimplemented driver classes or hypothetical adapters.
- Do not add optional dependencies or infrastructure without a concrete accepted use case.

## Verification and history

- Follow docs/verification.md. Add tests at public behavioral boundaries with the implementation that changes them.
- Every commit must pass the checks relevant to all behavior available at that stage. Later stages retain earlier checks.
- Never fabricate model, human, test, performance or failure evidence. Label scripted fixtures as fixtures.
- Keep commits focused, with an imperative subject. Add a body when it explains a non-obvious reason or tradeoff. No em dashes in prose, code comments or commit messages.
- Update the plan ledger only after the stage's exit gate passes. Record design changes in docs/decisions.md.
- Do not rewrite published history without a direct request. Fix regressions with a clear corrective commit.
- The repository is private during development. Publication or email submission requires the owner's instruction.

## Commands

Use `corepack yarn install --immutable`, `yarn setup`, `yarn doctor`, and `yarn check`. The aggregate check runs lint/format, strict typechecking, unit tests and browser tests. Use `yarn format` to apply formatting before checking. Browser tests have no retry-to-green behavior. Runtime output belongs in ignored `.local/`.
