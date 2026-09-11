import { expect, test } from "@playwright/test";
import { OpenAIDecisions } from "../../src/discovery/openai.js";
import { BrowserSurface } from "../../src/surfaces/browser.js";
import { fixtureFlow } from "../fixtures/flows.js";
import { setupOperator as setup } from "../fixtures/operator.js";

test("operator API rejects missing credentials, cross-origin commands and invalid bodies", async ({
  request,
}) => {
  const app = await setup();
  try {
    expect((await request.get(`${app.server.origin}/api/workspace`)).status()).toBe(401);
    const headers = {
      Authorization: `Bearer ${app.server.token}`,
      "Content-Type": "application/json",
    };
    expect(
      (
        await request.post(`${app.server.origin}/api/runs`, {
          headers: { ...headers, Origin: "http://attacker.invalid" },
          data: {},
        })
      ).status(),
    ).toBe(403);
    expect(
      (await request.post(`${app.server.origin}/api/runs`, { headers, data: {} })).status(),
    ).toBe(403);
    expect(
      (
        await request.post(`${app.server.origin}/api/runs`, {
          headers: { ...headers, Origin: app.server.origin },
          data: { unexpected: true },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await request.post(`${app.server.origin}/api/runs`, {
          headers: { ...headers, Origin: app.server.origin },
          data: { oversized: "x".repeat(20_000) },
        })
      ).status(),
    ).toBe(400);
    expect((await app.manager.workspace()).runs).toHaveLength(0);
  } finally {
    await app.close();
  }
});

test("shutdown waits for an admitted session startup and leaves no active run", async () => {
  const app = await setup();
  try {
    const starting = app.manager.start({
      workflow: "savings",
      mode: "replay",
      scenario: "normal",
      inputs: { memberId: "A1001" },
    });
    const results = await Promise.allSettled([starting, app.manager.close()]);
    expect(results[0]).toMatchObject({ status: "rejected", reason: { message: "CANCELED" } });
    expect((await app.manager.workspace()).runs).toHaveLength(0);
  } finally {
    await app.close();
  }
});

test("a late image poll cannot erase the terminal snapshot", async () => {
  const app = await setup();
  const original = BrowserSurface.prototype.screenshot;
  const entered = Promise.withResolvers<void>();
  const delayed = Promise.withResolvers<Buffer | null>();
  let pending: Promise<Buffer | null> | undefined;
  try {
    const { id } = await app.manager.start({
      workflow: "savings",
      mode: "replay",
      scenario: "intervention",
      inputs: { memberId: "A1001" },
    });
    const current = async () => (await app.manager.workspace()).runs.find((run) => run.id === id)!;
    await expect.poll(async () => (await current()).owner).toBe("awaiting_human");
    BrowserSurface.prototype.screenshot = async function () {
      BrowserSurface.prototype.screenshot = original;
      entered.resolve();
      return delayed.promise;
    };
    pending = app.manager.image(id);
    await entered.promise;
    await app.manager.command(id, { kind: "claim", epoch: (await current()).epoch });
    const state = await current();
    await app.manager.command(id, {
      kind: "act",
      epoch: state.epoch,
      generation: state.generation,
      action: { kind: "click", target: "acknowledge-notice" },
    });
    await app.manager.command(id, { kind: "resume", epoch: (await current()).epoch });
    await expect.poll(async () => (await current()).phase, { timeout: 20000 }).toBe("success");
    const completed = await app.manager.image(id);
    expect(completed?.length).toBeGreaterThan(0);
    delayed.resolve(null);
    await pending;
    expect(await app.manager.image(id)).toEqual(completed);
  } finally {
    BrowserSurface.prototype.screenshot = original;
    delayed.resolve(null);
    await pending;
    await app.close();
  }
});

test("canceling discovery validation stops the child replay and prevents approval", async () => {
  const app = await setup();
  const priorKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-only";
  const decide = OpenAIDecisions.prototype.decide;
  const act = BrowserSurface.prototype.act;
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const actions = fixtureFlow().steps.map((step) => step.action);
  let fills = 0;
  let searches = 0;
  OpenAIDecisions.prototype.decide = async () => {
    const action = actions.shift();
    return {
      decision: action ? { kind: "act", action } : { kind: "finish", action: null },
      metadata: { model: "test-fixture", responseId: "fixture", inputTokens: 1, outputTokens: 1 },
    };
  };
  BrowserSurface.prototype.act = async function (action, inputs, owner) {
    if (action.target === "member-field" && ++fills === 2) {
      entered.resolve();
      await release.promise;
    }
    if (action.target === "search-members") searches++;
    return act.call(this, action, inputs, owner);
  };
  try {
    const { id } = await app.manager.start({
      workflow: "savings",
      mode: "discovery",
      scenario: "normal",
      inputs: { memberId: "A1001" },
    });
    await entered.promise;
    const current = async () => (await app.manager.workspace()).runs.find((run) => run.id === id)!;
    expect((await current()).phase).toBe("validating");
    await app.manager.command(id, { kind: "cancel" });
    release.resolve();
    await expect.poll(async () => (await current()).phase).toBe("canceled");
    expect(await current()).toMatchObject({ canApprove: false, outputs: [], code: "CANCELED" });
    expect(searches).toBe(1);
    expect(() => app.manager.artifact(id)).toThrow("CONTROL_CONFLICT");
  } finally {
    release.resolve();
    await app.close();
    OpenAIDecisions.prototype.decide = decide;
    BrowserSurface.prototype.act = act;
    if (priorKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = priorKey;
  }
});
