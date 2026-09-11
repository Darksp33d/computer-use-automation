import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import type { Scenario } from "../../demo/fixtures.js";
import { startTarget } from "../../demo/server.js";
import { createSession } from "../../src/services/session.js";
import { fixtureFlow } from "../fixtures/flows.js";

for (const memberId of ["A1001", "B1002"]) {
  test(`model-free replay returns the actual UI balance for ${memberId}`, async () => {
    const target = await startTarget();
    const directory = await mkdtemp(join(tmpdir(), "relay-replay-"));
    const session = await createSession(
      JSON.stringify(fixtureFlow()),
      { memberId },
      { origin: target.origin, directory },
    );
    try {
      const result = await session.replay();
      expect(result.status).toBe("success");
      if (result.status === "success")
        expect(result.outputs).toEqual({
          availableBalanceMinor: memberId === "A1001" ? 1245075 : 823010,
          currency: "USD",
          accountType: "savings",
        });
      const persisted = await readFile(join(session.directory, "result.json"), "utf8");
      expect(persisted).toContain("[redacted]");
      expect(persisted).not.toContain("1245075");
      expect(target.stats.commits).toBe(0);
    } finally {
      await session.close();
      await target.close();
      await rm(directory, { recursive: true });
    }
  });
}

for (const [scenario, expectedStatus, code] of [
  ["not-found", "business_outcome", "MEMBER_NOT_FOUND"],
  ["no-account", "business_outcome", "ACCOUNT_NOT_FOUND"],
  ["permission", "failure", "PERMISSION_DENIED"],
  ["unavailable", "failure", "APP_UNAVAILABLE"],
  ["malformed-balance", "failure", "OUTPUT_INVALID"],
  ["wrong-member", "failure", "CHECKPOINT_FAILED"],
  ["wrong-currency", "failure", "OUTPUT_INVALID"],
  ["wrong-account-type", "failure", "OUTPUT_INVALID"],
] as const) {
  test(`replay deliberately classifies ${scenario}`, async () => {
    const target = await startTarget({ scenario });
    const directory = await mkdtemp(join(tmpdir(), "relay-outcome-"));
    const session = await createSession(
      JSON.stringify(fixtureFlow()),
      { memberId: "A1001" },
      { origin: target.origin, directory, conditionTimeoutMs: 600 },
    );
    try {
      expect(await session.replay()).toMatchObject({ status: expectedStatus, code });
      expect(await readFile(join(session.directory, "structure.json"), "utf8")).not.toContain(
        "A1001",
      );
      expect(target.stats.commits).toBe(0);
    } finally {
      await session.close();
      await target.close();
      await rm(directory, { recursive: true });
    }
  });
}

for (const scenario of ["notice", "slow", "delayed-click"] satisfies Scenario[]) {
  test(`replay handles ${scenario} without duplicate search actions`, async () => {
    const target = await startTarget({ scenario });
    const directory = await mkdtemp(join(tmpdir(), "relay-recovery-"));
    const session = await createSession(
      JSON.stringify(fixtureFlow()),
      { memberId: "A1001" },
      { origin: target.origin, directory },
    );
    try {
      expect((await session.replay()).status).toBe("success");
      expect(target.stats.searches).toBe(1);
    } finally {
      await session.close();
      await target.close();
      await rm(directory, { recursive: true });
    }
  });
}

test("review capability stops before the account-opening boundary", async () => {
  const target = await startTarget();
  const directory = await mkdtemp(join(tmpdir(), "relay-review-"));
  const session = await createSession(
    JSON.stringify(fixtureFlow("review")),
    { memberId: "B1002", nickname: "Travel fund", accountType: "savings" },
    { origin: target.origin, directory },
  );
  try {
    expect(await session.replay()).toMatchObject({
      status: "success",
      outputs: { preparationStatus: "ready-for-review" },
    });
    await expect(
      session.surface.act({ kind: "click", target: "open-account" }, {}, "human"),
    ).rejects.toThrow("POLICY_DENIED");
    expect(target.stats.commits).toBe(0);
  } finally {
    await session.close();
    await target.close();
    await rm(directory, { recursive: true });
  }
});

test("application validation remains a business outcome after valid boundary inputs", async () => {
  const target = await startTarget({ scenario: "validation" });
  const directory = await mkdtemp(join(tmpdir(), "review-validation-"));
  const session = await createSession(
    JSON.stringify(fixtureFlow("review")),
    { memberId: "A1001", accountType: "checking", nickname: "Travel" },
    { origin: target.origin, directory },
  );
  try {
    expect(await session.replay()).toMatchObject({
      status: "business_outcome",
      code: "VALIDATION_REJECTED",
    });
    expect(target.stats.commits).toBe(0);
  } finally {
    await session.close();
    await target.close();
    await rm(directory, { recursive: true });
  }
});

test("a timed-out navigation reports unknown effect without repeating the request", async () => {
  const target = await startTarget({ scenario: "delayed-click" });
  const directory = await mkdtemp(join(tmpdir(), "uncertain-navigation-"));
  const session = await createSession(
    JSON.stringify(fixtureFlow()),
    { memberId: "A1001" },
    { origin: target.origin, directory, conditionTimeoutMs: 200 },
  );
  try {
    expect(await session.replay()).toMatchObject({ status: "failure", effect: "unknown" });
    expect(target.stats.savingsLoads).toBe(1);
    expect(target.stats.searches).toBe(1);
    expect(target.stats.commits).toBe(0);
  } finally {
    await session.close();
    await target.close();
    await rm(directory, { recursive: true });
  }
});
