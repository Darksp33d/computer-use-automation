import type { Capability } from "../../src/contracts/capability.js";

export function fixtureCapability(): Capability {
  return {
    schemaVersion: 1,
    id: "fixture-balance",
    revision: 1,
    description: "Hand-authored contract test fixture, not discovery evidence",
    application: { family: "legacy-bank", bindingVersion: 1, driver: "browser-v1" },
    inputs: { memberId: { kind: "string", minLength: 1, maxLength: 32, sensitivity: "sensitive" } },
    outputs: {
      balance: {
        target: "balance",
        parser: "usd-minor",
        allowedValues: [],
        sensitivity: "sensitive",
      },
    },
    targets: {
      balance: {
        kind: "cell",
        frame: "workspace",
        caption: "Available balance",
        rationale: "Exact caption within a unique frame",
      },
    },
    entry: { route: "search", conditions: [{ kind: "visible", target: "balance" }] },
    steps: [
      {
        id: "read-balance",
        action: { kind: "read", target: "balance", output: "balance" },
        preconditions: [{ kind: "visible", target: "balance" }],
        postconditions: [{ kind: "visible", target: "balance" }],
        effect: "read",
      },
    ],
    outcomes: [],
    recovery: [],
    success: [{ kind: "visible", target: "balance" }],
    provenance: {
      kind: "test-fixture",
      runId: "00000000-0000-4000-8000-000000000000",
      model: "none",
      promptVersion: 1,
      browserVersion: "fixture",
      sourceRevision: "0".repeat(40),
    },
  };
}
