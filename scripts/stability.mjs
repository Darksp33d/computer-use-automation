import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { availableParallelism, cpus, platform, totalmem } from "node:os";
import { join } from "node:path";
import { startTarget } from "../dist/demo/server.js";
import { writeNewJson } from "../dist/src/evidence/files.js";
import { Catalog } from "../dist/src/services/catalog.js";
import { createSession } from "../dist/src/services/session.js";

const count = 100;
const concurrency = 2;
const directory = join(".local/stability", randomUUID());
await mkdir(directory, { recursive: true, mode: 0o700 });
const source = await new Catalog("capabilities").load("read-savings-balance", 1);
const sourceRevision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const startedAt = new Date().toISOString();
const started = performance.now();
const runs = [];
let next = 0;
let browserVersion;
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (next < count) {
      const index = next++;
      const target = await startTarget();
      const began = performance.now();
      let session;
      try {
        session = await createSession(
          source,
          { memberId: index % 2 ? "B1002" : "A1001" },
          {
            origin: target.origin,
            directory: join(directory, "runs"),
          },
        );
        browserVersion = session.surface.browserVersion;
        const result = await session.replay();
        const correct =
          result.status === "success" &&
          result.outputs.availableBalanceMinor === (index % 2 ? 823010 : 1245075) &&
          result.outputs.currency === "USD" &&
          result.outputs.accountType === "savings";
        runs.push({
          index,
          runId: session.runId,
          status: result.status,
          correct,
          elapsedMs: performance.now() - began,
          requests: target.stats.requests,
          searches: target.stats.searches,
          commits: target.stats.commits,
        });
      } catch {
        runs.push({
          index,
          runId: session?.runId ?? null,
          status: "startup-failure",
          correct: false,
          elapsedMs: performance.now() - began,
          requests: target.stats.requests,
          searches: target.stats.searches,
          commits: target.stats.commits,
        });
      } finally {
        await session?.close();
        await target.close();
      }
      if (runs.length % 10 === 0) console.error(`Completed ${runs.length}/${count} fresh sessions`);
    }
  }),
);
const times = runs.map((run) => run.elapsedMs).sort((a, b) => a - b);
const percentile = (p) => times[Math.ceil(times.length * p) - 1];
const summary = {
  sourceRevision,
  startedAt,
  completedAt: new Date().toISOString(),
  count,
  concurrency,
  totalElapsedMs: performance.now() - started,
  passed: runs.filter((run) => run.correct).length,
  latencyMs: { p50: percentile(0.5), p95: percentile(0.95), max: times.at(-1) },
  runtime: {
    node: process.version,
    browser: browserVersion,
    platform: platform(),
    availableParallelism: availableParallelism(),
    cpu: cpus()[0]?.model,
    memoryBytes: totalmem(),
  },
  artifact: { id: "read-savings-balance", revision: 1 },
  method:
    "100 fresh target and Chromium sessions, alternating two synthetic inputs; no retries; latency includes browser startup and replay but excludes cleanup.",
  limit:
    "Local small-sample stability observation, not a production availability or throughput claim.",
  runs: runs.sort((a, b) => a.index - b.index),
};
await writeNewJson(join(directory, "summary.json"), summary);
console.log(
  JSON.stringify({ summary: join(directory, "summary.json"), passed: summary.passed, count }),
);
if (summary.passed !== count) process.exitCode = 1;
