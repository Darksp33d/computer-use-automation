import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";

const root = "evidence";
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifest = await json(join(root, "manifest.json"));
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
  const path = manifest.files.includes(file) ? join(root, file.path) : file.path;
  const bytes = await readFile(path);
  assert.equal(hash(bytes), file.sha256, `Digest mismatch: ${path}`);
  if (file.bytes !== undefined) assert.equal(bytes.length, file.bytes, path);
}
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
  const run = capture.runs.find((item) => item.id === id);
  if (run) assert.equal(result.status, run.status);
  const decisions = events.filter((event) => event.type === "model-decision");
  if (run?.mode === "discovery") {
    assert.ok(decisions.length > 0);
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
console.log(
  `Verified ${manifest.files.length} evidence files and ${manifest.runtimeFiles.length} runtime source digests`,
);
