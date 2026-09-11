import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { bankActions, bankMarkers, bankRoutes, bankTargets } from "../applications/legacy-bank.js";
import { type Capability, Identifier } from "../contracts/capability.js";
import { RunError } from "../contracts/errors.js";
import { parseCapability } from "../contracts/validate.js";
import { writeNewJson } from "../evidence/files.js";

const digest = (source: string) => createHash("sha256").update(source).digest("hex");
const bindingDigest = () =>
  digest(JSON.stringify({ bankActions, bankMarkers, bankRoutes, bankTargets }));
const Approval = z.strictObject({
  capabilityId: Identifier,
  revision: z.int().positive(),
  artifactDigest: z.string().regex(/^[a-f0-9]{64}$/),
  bindingDigest: z.string().regex(/^[a-f0-9]{64}$/),
  discoveryRunId: z.uuid(),
  replayRunId: z.uuid(),
  reviewedAt: z.iso.datetime(),
  reviewer: z.enum(["local-operator", "engineering-review"]),
});
export type CatalogEntry = z.infer<typeof Approval>;

export class Catalog {
  constructor(readonly directory: string) {}

  async list(): Promise<CatalogEntry[]> {
    let names: string[];
    try {
      names = await readdir(this.directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw new RunError("EVIDENCE_UNAVAILABLE");
    }
    if (names.length > 400) throw new RunError("BUDGET_EXCEEDED");
    const entries: CatalogEntry[] = [];
    for (const name of names.filter((name) =>
      /^[a-z][a-zA-Z0-9-]*-[0-9]+\.approval\.json$/.test(name),
    )) {
      try {
        const entry = Approval.parse(
          JSON.parse(await readFile(join(this.directory, name), "utf8")),
        );
        if (name !== `${entry.capabilityId}-${entry.revision}.approval.json`) throw new Error();
        entries.push(entry);
      } catch {
        throw new RunError("INVALID_ARTIFACT");
      }
    }
    return entries.sort((a, b) => b.revision - a.revision);
  }

  async load(id: string, revision: number): Promise<string> {
    if (!Identifier.safeParse(id).success || !Number.isSafeInteger(revision) || revision < 1)
      throw new RunError("INVALID_ARTIFACT");
    const entry = (await this.list()).find(
      (item) => item.capabilityId === id && item.revision === revision,
    );
    if (!entry || entry.bindingDigest !== bindingDigest())
      throw new RunError("UNSUPPORTED_BINDING");
    let source: string;
    try {
      source = await readFile(join(this.directory, `${id}-${revision}.json`), "utf8");
    } catch {
      throw new RunError("INVALID_ARTIFACT");
    }
    const capability = parseCapability(source);
    if (
      digest(source) !== entry.artifactDigest ||
      capability.id !== id ||
      capability.revision !== revision ||
      capability.provenance.runId !== entry.discoveryRunId
    )
      throw new RunError("INVALID_ARTIFACT");
    return source;
  }

  async approve(capability: Capability, replayRunId: string, reviewer: CatalogEntry["reviewer"]) {
    const parsed = parseCapability(JSON.stringify(capability));
    if (parsed.provenance.kind !== "discovery" || parsed.provenance.model === "test-fixture")
      throw new RunError("INVALID_ARTIFACT");
    const source = `${JSON.stringify(parsed, null, 2)}\n`;
    const entry = Approval.parse({
      capabilityId: parsed.id,
      revision: parsed.revision,
      artifactDigest: digest(source),
      bindingDigest: bindingDigest(),
      discoveryRunId: parsed.provenance.runId,
      replayRunId,
      reviewedAt: new Date().toISOString(),
      reviewer,
    });
    await writeNewJson(join(this.directory, `${parsed.id}-${parsed.revision}.json`), parsed);
    await writeNewJson(
      join(this.directory, `${parsed.id}-${parsed.revision}.approval.json`),
      entry,
    );
    return entry;
  }
}
