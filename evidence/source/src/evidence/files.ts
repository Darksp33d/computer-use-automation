import { randomUUID } from "node:crypto";
import { link, mkdir, open, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { RunError } from "../contracts/errors.js";

export async function writeNewJson(path: string, value: unknown) {
  const directory = dirname(path);
  const temporary = join(directory, `.pending-${randomUUID()}`);
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const file = await open(temporary, "wx", 0o600);
    try {
      await file.writeFile(`${JSON.stringify(value, null, 2)}\n`);
      await file.sync();
    } finally {
      await file.close();
    }
    // Linking publishes complete bytes without replacing an existing revision.
    await link(temporary, path);
  } catch {
    throw new RunError("EVIDENCE_UNAVAILABLE");
  } finally {
    await unlink(temporary).catch(() => {});
  }
}
