import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { writeNewJson } from "../../src/evidence/files.js";
import { type EventPayload, Journal } from "../../src/evidence/journal.js";

test("journal rejects unknown sensitive fields before persistence", async () => {
  const directory = await mkdtemp(join(tmpdir(), "relay-evidence-"));
  const journal = await Journal.create(directory, randomUUID());
  try {
    await journal.append({ type: "run-started" });
    await assert.rejects(
      journal.append({
        type: "action-intent",
        rawInput: "PRIVATE-CANARY",
      } as unknown as EventPayload),
      /EVIDENCE_UNAVAILABLE/,
    );
    assert.doesNotMatch(await readFile(join(directory, "events.jsonl"), "utf8"), /PRIVATE-CANARY/);
    await assert.rejects(
      journal.append({ type: "run-finished", status: "success" }),
      /EVIDENCE_UNAVAILABLE/,
    );
  } finally {
    await journal.close();
    await rm(directory, { recursive: true });
  }
});

test("concurrent journal writes preserve sequence and cannot overwrite an existing run", async () => {
  const directory = await mkdtemp(join(tmpdir(), "relay-evidence-"));
  const journal = await Journal.create(directory, randomUUID());
  try {
    await Promise.all([
      journal.append({ type: "run-started" }),
      journal.append({ type: "checkpoint" }),
    ]);
    const events = (await readFile(join(directory, "events.jsonl"), "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.deepEqual(
      events.map((event) => event.seq),
      [1, 2],
    );
    await assert.rejects(Journal.create(directory, randomUUID()), /EVIDENCE_UNAVAILABLE/);
  } finally {
    await journal.close();
    await rm(directory, { recursive: true });
  }
});

test("artifact publication is complete and never replaces an existing revision", async () => {
  const directory = await mkdtemp(join(tmpdir(), "relay-artifact-"));
  try {
    const path = join(directory, "artifact.json");
    await writeNewJson(path, { revision: 1 });
    await assert.rejects(writeNewJson(path, { revision: 2 }), /EVIDENCE_UNAVAILABLE/);
    assert.deepEqual(JSON.parse(await readFile(path, "utf8")), { revision: 1 });
  } finally {
    await rm(directory, { recursive: true });
  }
});

for (const limit of ["events", "bytes"] as const) {
  test(`journal ${limit} quota stops admission without extending the file`, async () => {
    const directory = await mkdtemp(join(tmpdir(), "groove-quota-"));
    const journal = await Journal.create(directory, randomUUID());
    const payload: EventPayload =
      limit === "events"
        ? { type: "checkpoint" }
        : {
            type: "model-decision",
            stepId: "s".repeat(64),
            target: "t".repeat(64),
            provider: {
              model: "m".repeat(80),
              responseId: "r".repeat(160),
              inputTokens: 1,
              outputTokens: 1,
            },
          };
    try {
      let stopped = false;
      for (let count = 0; count <= 2000; count++) {
        try {
          await journal.append(payload);
        } catch (error) {
          assert.match(String(error), /EVIDENCE_UNAVAILABLE/);
          stopped = true;
          break;
        }
      }
      assert.equal(stopped, true);
      const before = await readFile(join(directory, "events.jsonl"));
      assert.ok(before.length <= 1_048_576);
      if (limit === "events") assert.equal(journal.events.length, 2000);
      else assert.ok(journal.events.length > 1000 && journal.events.length < 2000);
      await assert.rejects(journal.append({ type: "checkpoint" }), /EVIDENCE_UNAVAILABLE/);
      assert.deepEqual(await readFile(join(directory, "events.jsonl")), before);
    } finally {
      await journal.close();
      await rm(directory, { recursive: true });
    }
  });
}
