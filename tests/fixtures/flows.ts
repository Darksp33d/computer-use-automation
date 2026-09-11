import {
  bankOutcomes,
  bankRecovery,
  bankTargets,
  taskContracts,
  visible,
} from "../../src/applications/legacy-bank.js";
import type { Action, Capability, Condition, Step } from "../../src/contracts/capability.js";

export function fixtureFlow(workflow: "savings" | "review" = "savings"): Capability {
  const steps: Step[] = [];
  const subject: Condition = { kind: "equalsInput", target: "member-number", input: "memberId" };
  const add = (
    action: Action,
    before: string,
    after: string,
    effect: "read" | "reversible",
    extra: Condition[] = [],
  ) => {
    const postconditions: Condition[] = [visible(after)];
    if (action.kind === "fill" || action.kind === "select")
      postconditions.push({ kind: "equalsInput", target: action.target, input: action.input });
    steps.push({
      id: `step-${steps.length + 1}`,
      action,
      preconditions: [visible(before), ...extra],
      postconditions,
      effect,
    });
  };
  add(
    { kind: "fill", target: "member-field", input: "memberId" },
    "search-screen",
    "search-screen",
    "reversible",
  );
  add({ kind: "click", target: "search-members" }, "search-screen", "results-screen", "read");
  add({ kind: "click", target: "open-member" }, "results-screen", "member-screen", "read");
  if (workflow === "savings") {
    add({ kind: "click", target: "view-savings" }, "member-screen", "savings-screen", "read", [
      subject,
    ]);
    for (const [output, definition] of Object.entries(taskContracts.savings.outputs))
      add(
        { kind: "read", target: definition.target, output },
        "savings-screen",
        "savings-screen",
        "read",
        [subject],
      );
  } else {
    add({ kind: "click", target: "new-account" }, "member-screen", "form-screen", "reversible", [
      subject,
    ]);
    add(
      { kind: "select", target: "account-type-field", input: "accountType" },
      "form-screen",
      "form-screen",
      "reversible",
      [subject],
    );
    add(
      { kind: "fill", target: "nickname-field", input: "nickname" },
      "form-screen",
      "form-screen",
      "reversible",
      [subject],
    );
    add({ kind: "click", target: "review-account" }, "form-screen", "review-screen", "reversible", [
      subject,
    ]);
    add(
      { kind: "read", target: "preparation-status", output: "preparationStatus" },
      "review-screen",
      "review-screen",
      "read",
      [subject],
    );
  }
  return {
    schemaVersion: 1,
    ...taskContracts[workflow],
    revision: 1,
    application: { family: "legacy-bank", bindingVersion: 1, driver: "browser-v1" },
    targets: bankTargets,
    entry: { route: "search", conditions: [visible("search-screen")] },
    steps,
    outcomes: bankOutcomes,
    recovery: bankRecovery,
    provenance: {
      kind: "test-fixture",
      runId: "00000000-0000-4000-8000-000000000000",
      model: "none",
      promptVersion: 1,
      browserVersion: "test-fixture",
      sourceRevision: "0".repeat(40),
    },
  };
}
