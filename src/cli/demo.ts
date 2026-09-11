import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { RunManager } from "../operator/manager.js";
import { startOperator } from "../operator/server.js";
import { Catalog } from "../services/catalog.js";

const sourceRevision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const manager = new RunManager(new Catalog("capabilities"), ".local/runs", sourceRevision);
const server = await startOperator(manager, { port: 4173, assets: resolve("dist/ui") });
console.log(`Praxis Loom is ready. Open this local launch link:\n${server.url}`);
const stop = () => {
  void server.close().catch(() => {
    process.exitCode = 1;
  });
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
