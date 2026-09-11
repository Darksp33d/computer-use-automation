import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { RunManager } from "../../src/operator/manager.js";
import { startOperator } from "../../src/operator/server.js";
import { Catalog } from "../../src/services/catalog.js";

export async function setupOperator() {
  const directory = await mkdtemp(join(tmpdir(), "relay-console-"));
  const manager = new RunManager(new Catalog(resolve("capabilities")), directory, "0".repeat(40));
  const server = await startOperator(manager, { assets: resolve("dist/ui") });
  return {
    server,
    manager,
    async close() {
      await server.close();
      await rm(directory, { recursive: true, force: true });
    },
  };
}
