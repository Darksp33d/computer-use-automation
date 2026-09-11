import assert from "node:assert/strict";
import { test } from "node:test";
import { Ownership } from "../../src/core/ownership.js";

test("only one operator can claim a paused session", async () => {
  const ownership = new Ownership();
  const paused = await ownership.pause();
  const claims = await Promise.allSettled([
    ownership.claim(paused.epoch),
    ownership.claim(paused.epoch),
  ]);
  assert.equal(claims.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(ownership.state.owner, "human");
  await assert.rejects(
    ownership.run("automation", 0, async () => assert.fail("stale action dispatched")),
    /STALE_CONTROL/,
  );
});

test("control transfer waits for accepted input to settle", async () => {
  const ownership = new Ownership();
  const release = Promise.withResolvers<void>();
  const accepted = Promise.withResolvers<void>();
  const action = ownership.run("automation", 0, async () => {
    accepted.resolve();
    await release.promise;
  });
  await accepted.promise;
  const pause = ownership.pause();
  assert.equal(ownership.state.owner, "automation");
  release.resolve();
  await action;
  assert.equal((await pause).owner, "awaiting_human");
});

test("failed resume stays paused and invalidates the old human command generation", async () => {
  const ownership = new Ownership();
  const paused = await ownership.pause();
  const human = await ownership.claim(paused.epoch);
  const resumed = await ownership.resume(human.epoch, async () => false);
  assert.equal(resumed.owner, "awaiting_human");
  await assert.rejects(
    ownership.run("human", human.epoch, async () => assert.fail()),
    /STALE_CONTROL/,
  );
});

test("successful resume and lease expiration never allow stale commands", async () => {
  const ownership = new Ownership();
  const human = await ownership.claim((await ownership.pause()).epoch);
  const resumed = await ownership.resume(human.epoch, async () => true);
  assert.equal(resumed.owner, "automation");
  assert.equal((await ownership.expire(human.epoch)).owner, "automation");
  await ownership.finish();
  await assert.rejects(
    ownership.run("automation", resumed.epoch, async () => assert.fail()),
    /STALE_CONTROL/,
  );
});
