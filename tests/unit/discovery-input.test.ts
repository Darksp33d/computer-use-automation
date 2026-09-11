import assert from "node:assert/strict";
import { test } from "node:test";
import { taskContracts } from "../../src/applications/legacy-bank.js";
import { prepareGoal } from "../../src/contracts/discovery.js";
import { StartRequest } from "../../src/operator/contracts.js";

test("discovery requires a goal and approved target, with private values replaced by references", () => {
  const request = {
    mode: "discovery",
    workflow: "savings",
    scenario: "normal",
    inputs: { memberId: "A1001" },
  };
  assert.equal(StartRequest.safeParse(request).success, false);
  assert.equal(
    StartRequest.safeParse({
      ...request,
      goal: "Read the savings balance.",
      target: "https://attacker.invalid",
    }).success,
    false,
  );
  assert.equal(
    StartRequest.safeParse({ ...request, goal: "Read the savings balance.", target: "northstar" })
      .success,
    true,
  );
  assert.equal(
    prepareGoal(
      { goal: "Read the balance for A1001.", target: "northstar" },
      taskContracts.savings,
      request.inputs,
    ),
    "Read the balance for {memberId}.",
  );
  for (const goal of [
    "Use password PRIVATE-CANARY",
    "Read john@example.com",
    "Read member 12345678",
    "Read {unknown} balance",
    "x".repeat(501),
  ]) {
    assert.throws(
      () => prepareGoal({ goal, target: "northstar" }, taskContracts.savings, request.inputs),
      /INVALID_INPUT/,
    );
  }
});
