import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { startTarget } from "../../demo/server.js";
import { discover } from "../../src/discovery/discover.js";
import type { DecisionProvider, DiscoveryView } from "../../src/discovery/provider.js";
import { createDiscoverySession, createSession } from "../../src/services/session.js";
import { fixtureFlow } from "../fixtures/flows.js";

const metadata = { model: "test-fixture", responseId: "fixture", inputTokens: 1, outputTokens: 1 };

test("compiler records only executed parameterized actions and replay uses a different member", async () => {
  const directory = await mkdtemp(join(tmpdir(), "relay-discovery-"));
  const target = await startTarget({ scenario: "normal" });
  const session = await createDiscoverySession("savings", { memberId: "A1001" }, "0".repeat(40), {
    origin: target.origin,
    directory,
  });
  const views: DiscoveryView[] = [];
  const actions = fixtureFlow().steps.map((step) => step.action);
  const provider: DecisionProvider = {
    async decide(view) {
      views.push(view);
      const action = actions.shift();
      return {
        decision: action ? { kind: "act", action } : { kind: "finish", action: null },
        metadata,
      };
    },
  };
  try {
    expect((await discover(session, provider)).status).toBe("success");
    const artifact = await readFile(join(session.directory, "capability.json"), "utf8");
    expect(artifact).not.toContain("A1001");
    expect(JSON.stringify(views)).not.toContain("A1001");
    const replay = await createSession(
      artifact,
      { memberId: "B1002" },
      { origin: target.origin, directory },
    );
    try {
      expect(await replay.replay()).toMatchObject({
        status: "success",
        outputs: { availableBalanceMinor: 823010 },
      });
    } finally {
      await replay.close();
    }
  } finally {
    await session.close();
    await target.close();
    await rm(directory, { recursive: true, force: true });
  }
});

for (const behavior of ["premature-finish", "forbidden-action", "repeated-action"] as const) {
  test(`discovery rejects ${behavior} without publishing a capability`, async () => {
    const directory = await mkdtemp(join(tmpdir(), "relay-discovery-"));
    const target = await startTarget({ scenario: "normal" });
    const session = await createDiscoverySession("savings", { memberId: "A1001" }, "0".repeat(40), {
      origin: target.origin,
      directory,
      conditionTimeoutMs: 300,
    });
    const provider: DecisionProvider = {
      async decide() {
        return {
          decision:
            behavior === "premature-finish"
              ? { kind: "finish", action: null }
              : {
                  kind: "act",
                  action:
                    behavior === "forbidden-action"
                      ? { kind: "click", target: "open-account" }
                      : { kind: "fill", target: "member-field", input: "memberId" },
                },
          metadata,
        };
      },
    };
    try {
      expect(await discover(session, provider)).toMatchObject({
        status: "failure",
        code: {
          "premature-finish": "CHECKPOINT_FAILED",
          "forbidden-action": "POLICY_DENIED",
          "repeated-action": "NO_PROGRESS",
        }[behavior],
      });
      await expect(readFile(join(session.directory, "capability.json"))).rejects.toThrow();
      expect(target.stats.commits).toBe(0);
    } finally {
      await session.close();
      await target.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
}
