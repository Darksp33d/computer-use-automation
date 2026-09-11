import { parseArgs } from "node:util";
import { z } from "zod";
import { scenarios } from "../../demo/fixtures.js";
import { startTarget } from "../../demo/server.js";
import { Identifier } from "../contracts/capability.js";
import { failureCode, RunError } from "../contracts/errors.js";
import { Catalog } from "../services/catalog.js";
import { createSession, type Session, safeResult } from "../services/session.js";

let session: Session | undefined;
let target: Awaited<ReturnType<typeof startTarget>> | undefined;
let canceled = false;
const cancel = () => {
  canceled = true;
  session?.abort.abort();
  process.stdin.destroy();
};
process.once("SIGINT", cancel);
process.once("SIGTERM", cancel);
try {
  let options;
  try {
    const { values } = parseArgs({
      options: {
        capability: { type: "string", default: "read-savings-balance" },
        revision: { type: "string", default: "1" },
        scenario: { type: "string", default: "normal" },
        "show-sensitive": { type: "boolean", default: false },
      },
      allowPositionals: false,
    });
    options = z
      .strictObject({
        capability: Identifier,
        revision: z
          .string()
          .regex(/^[1-9][0-9]{0,5}$/)
          .transform(Number),
        scenario: z.enum(scenarios),
        "show-sensitive": z.boolean(),
      })
      .parse(values);
  } catch {
    throw new RunError("INVALID_INPUT");
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    const bytes = Buffer.from(chunk as Uint8Array);
    size += bytes.length;
    if (size > 16_384) throw new RunError("INVALID_INPUT");
    chunks.push(bytes);
  }
  let inputs: unknown;
  try {
    inputs = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RunError("INVALID_INPUT");
  }
  const source = await new Catalog("capabilities").load(options.capability, options.revision);
  if (canceled) throw new RunError("CANCELED");
  target = await startTarget({ scenario: options.scenario });
  session = await createSession(source, inputs, {
    origin: target.origin,
    directory: ".local/runs",
  });
  if (canceled) session.abort.abort();
  const result = await session.replay();
  console.log(
    JSON.stringify(
      options["show-sensitive"] ? result : safeResult(result, session.execution.capability),
    ),
  );
  process.exitCode = { success: 0, business_outcome: 2, failure: 3, canceled: 4 }[result.status];
} catch (error) {
  console.log(
    JSON.stringify({ status: "rejected", code: canceled ? "CANCELED" : failureCode(error) }),
  );
  process.exitCode = canceled ? 4 : 3;
} finally {
  await session?.close();
  await target?.close();
  process.removeListener("SIGINT", cancel);
  process.removeListener("SIGTERM", cancel);
}
