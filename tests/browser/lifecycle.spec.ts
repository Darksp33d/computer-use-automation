import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { startTarget } from "../../demo/server.js";
import { RunError } from "../../src/contracts/errors.js";
import { createSession } from "../../src/services/session.js";
import { fixtureFlow } from "../fixtures/flows.js";

for (const kind of ["cancel-before", "cancel-during", "browser-loss", "journal-loss"] as const) {
  test(`execution handles ${kind} without inventing or repeating an effect`, async () => {
    const target = await startTarget({ scenario: "slow" });
    const directory = await mkdtemp(join(tmpdir(), "lifecycle-"));
    const session = await createSession(
      JSON.stringify(fixtureFlow()),
      { memberId: "A1001" },
      {
        origin: target.origin,
        directory,
      },
    );
    try {
      if (kind === "cancel-before") session.abort.abort();
      if (kind === "journal-loss") await session.execution.journal.close();
      if (kind === "browser-loss") {
        const act = session.surface.act.bind(session.surface);
        session.surface.act = async (action, inputs, owner) => {
          const result = await act(action, inputs, owner);
          if (action.target === "search-members") {
            await session.surface.close();
            throw new RunError("UNCERTAIN_EFFECT");
          }
          return result;
        };
      }
      const running = session.replay();
      if (kind === "cancel-during") {
        await expect.poll(() => target.stats.searches).toBe(1);
        session.abort.abort();
      }
      const result = await running;
      if (kind === "cancel-before" || kind === "cancel-during")
        expect(result.status).toBe("canceled");
      if (kind === "journal-loss")
        expect(result).toMatchObject({
          status: "failure",
          code: "EVIDENCE_UNAVAILABLE",
          effect: "not_dispatched",
        });
      if (kind === "browser-loss") {
        expect(result).toMatchObject({
          status: "failure",
          code: "SESSION_LOST",
          effect: "unknown",
        });
        const events = (await readFile(join(session.directory, "events.jsonl"), "utf8"))
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line));
        expect(
          events.filter(
            (event) => event.type === "action-intent" && event.target === "search-members",
          ),
        ).toHaveLength(1);
        expect(
          events.filter(
            (event) => event.type === "action-completed" && event.target === "search-members",
          ),
        ).toHaveLength(0);
      }
      expect(target.stats.searches).toBe(
        kind === "cancel-before" || kind === "journal-loss" ? 0 : 1,
      );
      expect(target.stats.savingsLoads).toBe(0);
      expect(target.stats.commits).toBe(0);
    } finally {
      await session.close();
      await target.close();
      await rm(directory, { recursive: true });
    }
  });
}
