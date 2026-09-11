import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";

const root = "evidence";
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifest = await json(join(root, "manifest.json"));
assert.equal(manifest.sourceSnapshot, "source");
async function files(directory, prefix = "") {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(prefix, entry.name);
    assert.ok(!entry.isSymbolicLink(), `Unexpected symlink: ${path}`);
    if (entry.isDirectory()) result.push(...(await files(join(directory, entry.name), path)));
    else result.push(path);
  }
  return result.sort();
}
assert.deepEqual(
  (await files(root)).filter((path) => path !== "manifest.json"),
  manifest.files.map((file) => file.path).sort(),
  "Manifest must cover every exported file exactly once",
);
for (const file of [...manifest.files, ...manifest.runtimeFiles]) {
  assert.ok(!isAbsolute(file.path) && !file.path.split(/[\\/]/).includes(".."));
  const path = manifest.files.includes(file)
    ? join(root, file.path)
    : join(root, manifest.sourceSnapshot, file.path);
  const bytes = await readFile(path);
  assert.equal(hash(bytes), file.sha256, `Digest mismatch: ${path}`);
  if (file.bytes !== undefined) assert.equal(bytes.length, file.bytes, path);
}
let runtimeDifferences = 0;
const currentPaths = [
  ...(await files("src", "src")),
  ...(await files("demo", "demo")),
  ...(await files("ui", "ui")),
  ...(await files("schemas", "schemas")),
  "yarn.lock",
  "tsconfig.json",
  "scripts/assets.mjs",
];
const capturedPaths = new Set(manifest.runtimeFiles.map((file) => file.path));
runtimeDifferences += currentPaths.filter((path) => !capturedPaths.has(path)).length;
for (const file of manifest.runtimeFiles) {
  const current = await readFile(file.path).catch(() => Buffer.alloc(0));
  if (hash(current) !== file.sha256) runtimeDifferences++;
}
if (process.argv.includes("--current"))
  assert.equal(runtimeDifferences, 0, "Refresh evidence after runtime changes");
const capture = await json(join(root, "capture.json"));
assert.equal(capture.status, "success");
assert.equal(capture.sourceRevision, manifest.sourceRevision);
assert.deepEqual(capture.browserErrors, []);
for (const id of await readdir(join(root, "runs"))) {
  const directory = join(root, "runs", id);
  const result = await json(join(directory, "result.json"));
  const events = (await readFile(join(directory, "events.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.equal(result.runId, id);
  events.forEach((event, index) => {
    assert.equal(event.runId, id);
    assert.equal(event.seq, index + 1);
  });
  assert.equal(events[0].type, "run-started");
  assert.equal(events.at(-1).type, "run-finished");
  assert.equal(events.at(-1).status, result.status);
  if (result.code === "OUTPUT_INVALID") {
    assert.equal(result.diagnostic.expected.output.parser, "usd-minor");
    assert.equal(result.diagnostic.observed.screen, "savings-screen");
  }
  const run = capture.runs.find((item) => item.id === id);
  if (run) assert.equal(result.status, run.status);
  const decisions = events.filter((event) => event.type === "model-decision");
  if (run?.mode === "discovery") {
    assert.ok(decisions.length > 0);
    assert.equal(run.target, "northstar");
    assert.ok(run.publicGoal.length >= 10);
    assert.ok(!events.some((event) => JSON.stringify(event).includes(run.publicGoal)));
    if (run.code === "GOAL_UNSUPPORTED") {
      assert.equal(events.filter((event) => event.type === "action-intent").length, 0);
      assert.equal(result.effect, "not_dispatched");
    }
    for (const decision of decisions) {
      assert.equal(decision.provider.model, capture.model);
      assert.ok(decision.provider.responseId.startsWith("resp_"));
      assert.ok(decision.provider.inputTokens > 0);
    }
  } else assert.equal(decisions.length, 0, "Replay must have no provider decisions");
}
for (const run of capture.runs.filter((item) => item.approved)) {
  const name = `${run.capabilityId}-${run.revision}`;
  const bytes = await readFile(join(root, "artifacts", `${name}.json`));
  const artifact = JSON.parse(bytes);
  const approval = await json(join(root, "artifacts", `${name}.approval.json`));
  assert.equal(artifact.provenance.runId, run.id);
  assert.equal(artifact.provenance.promptVersion, 2);
  assert.equal(artifact.provenance.sourceRevision, manifest.sourceRevision);
  assert.equal(approval.replayRunId, run.validationRunId);
  assert.equal(
    (await json(join(root, "runs", run.validationRunId, "result.json"))).status,
    "success",
  );
  for (const suffix of [".json", ".approval.json"]) {
    assert.deepEqual(
      await readFile(join(root, "artifacts", name + suffix)),
      await readFile(join("capabilities", name + suffix)),
    );
  }
}
const cliRoot = join(root, "verification/cli-goal");
const invocation = await json(join(cliRoot, "invocation.json"));
const cliArtifact = await json(join(cliRoot, "capability.json"));
assert.equal(invocation.sourceRevision, manifest.sourceRevision);
assert.equal(cliArtifact.provenance.sourceRevision, manifest.sourceRevision);
assert.equal(cliArtifact.provenance.runId, invocation.discoveryRunId);
assert.equal(cliArtifact.provenance.promptVersion, 2);
assert.notEqual(invocation.request.inputs.memberId, invocation.validationMember);
for (const [mode, id] of [
  ["discovery", invocation.discoveryRunId],
  ["replay", invocation.replayRunId],
]) {
  const result = await json(join(cliRoot, mode, "result.json"));
  assert.equal(result.runId, id);
  assert.equal(result.status, "success");
  const events = (await readFile(join(cliRoot, mode, "events.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .map(JSON.parse);
  events.forEach((event, index) => {
    assert.equal(event.runId, id);
    assert.equal(event.seq, index + 1);
  });
  const decisions = events.filter((event) => event.type === "model-decision");
  if (mode === "replay") assert.equal(decisions.length, 0);
  else {
    assert.ok(decisions.length > 0);
    assert.ok(decisions.every((event) => event.provider.responseId.startsWith("resp_")));
  }
  assert.equal(events.at(-1).status, "success");
}
console.log(
  `Verified ${manifest.files.length} evidence files and ${manifest.runtimeFiles.length} runtime source digests; ${runtimeDifferences} differ from this checkout`,
);
