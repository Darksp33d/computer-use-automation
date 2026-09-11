import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { startTarget } from "../../demo/server.js";
import { SessionControl } from "../../src/operator/control.js";
import { createSession } from "../../src/services/session.js";
import { fixtureFlow } from "../fixtures/flows.js";

for (const scenario of ["intervention", "session-expired", "native-dialog"] as const) {
  test(`operator resolves ${scenario} in the original live session`, async () => {
    const directory = await mkdtemp(join(tmpdir(), "relay-handoff-"));
    const target = await startTarget({ scenario });
    const session = await createSession(
      JSON.stringify(fixtureFlow()),
      { memberId: "A1001" },
      { origin: target.origin, directory, conditionTimeoutMs: 700 },
    );
    const control = new SessionControl(session);
    const run = session.replay();
    try {
      await expect.poll(() => session.execution.ownership.state.owner).toBe("awaiting_human");
      const epoch = session.execution.ownership.state.epoch;
      const claims = await Promise.allSettled([control.claim(epoch), control.claim(epoch)]);
      expect(claims.filter((item) => item.status === "fulfilled")).toHaveLength(1);
      let state = session.execution.ownership.state;
      const premature = await control.resume(state.epoch);
      expect(premature.owner).toBe("awaiting_human");
      state = await control.claim(premature.epoch);
      const observation = await session.surface.observe();
      if (scenario === "native-dialog")
        await control.dismissDialog(state.epoch, observation.generation);
      else
        await control.command(state.epoch, observation.generation, {
          kind: "click",
          target: scenario === "session-expired" ? "restore-session" : "acknowledge-notice",
        });
      expect((await control.resume(state.epoch)).owner).toBe("automation");
      await expect(
        control.command(state.epoch, observation.generation, {
          kind: "click",
          target: "view-savings",
        }),
      ).rejects.toThrow("STALE_CONTROL");
      expect(await run).toMatchObject({
        status: "success",
        outputs: { availableBalanceMinor: 1245075 },
      });
      expect(target.stats.searches).toBe(1);
      expect(target.stats.commits).toBe(0);
      expect(
        session.execution.journal.events.some(
          (event) => event.type === "action-completed" && event.actor === "local-operator",
        ),
      ).toBe(true);
    } finally {
      control.cancel();
      await run;
      await session.close();
      await target.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
}

test("intervention expiry terminates instead of silently returning ownership", async () => {
  const directory = await mkdtemp(join(tmpdir(), "relay-expiry-"));
  const target = await startTarget({ scenario: "intervention" });
  const session = await createSession(
    JSON.stringify(fixtureFlow()),
    { memberId: "A1001" },
    { origin: target.origin, directory },
  );
  new SessionControl(session, 100);
  try {
    expect(await session.replay()).toMatchObject({
      status: "failure",
      code: "INTERVENTION_EXPIRED",
    });
    expect(session.execution.ownership.state.owner).toBe("terminal");
  } finally {
    await session.close();
    await target.close();
    await rm(directory, { recursive: true, force: true });
  }
});
