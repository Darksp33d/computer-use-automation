import { mkdir, readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { Capability } from "../dist/src/contracts/capability.js";

const path = new URL("../schemas/capability-v1.json", import.meta.url);
const source = `${JSON.stringify(z.toJSONSchema(Capability), null, 2)}\n`;
if (process.argv.includes("--check")) {
  if ((await readFile(path, "utf8")) !== source)
    throw new Error("Schema is stale. Run yarn schema:write.");
} else {
  await mkdir(new URL("../schemas/", import.meta.url), { recursive: true });
  await writeFile(path, source);
}
