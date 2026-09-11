import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parseCapability } from "../../src/contracts/validate.js";
import { Catalog } from "../../src/services/catalog.js";

test("catalog pins exact artifact bytes and rejects edits after review", async () => {
  const directory = await mkdtemp(join(tmpdir(), "relay-catalog-"));
  const catalog = new Catalog(directory);
  const source = await readFile("capabilities/read-savings-balance-1.json", "utf8");
  const capability = parseCapability(source);
  try {
    await catalog.approve(capability, "00000000-0000-4000-8000-000000000000", "engineering-review");
    assert.equal(await catalog.load(capability.id, capability.revision), source);
    await writeFile(join(directory, `${capability.id}-${capability.revision}.json`), `${source}\n`);
    await assert.rejects(catalog.load(capability.id, capability.revision), {
      message: "INVALID_ARTIFACT",
    });
    await assert.rejects(catalog.load("../outside", 1), { message: "INVALID_ARTIFACT" });
    await writeFile(join(directory, `${capability.id}-${capability.revision}.json`), source);
    const approvalPath = join(directory, `${capability.id}-${capability.revision}.approval.json`);
    const approval = JSON.parse(await readFile(approvalPath, "utf8"));
    approval.bindingDigest = "0".repeat(64);
    await writeFile(approvalPath, JSON.stringify(approval));
    await assert.rejects(catalog.load(capability.id, capability.revision), {
      message: "UNSUPPORTED_BINDING",
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
