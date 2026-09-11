import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { startTarget } from "../../demo/server.js";
import { taskContracts } from "../applications/legacy-bank.js";
import { DiscoveryIntent, prepareGoal } from "../contracts/discovery.js";
import { failureCode, RunError } from "../contracts/errors.js";
import { validateArguments } from "../contracts/validate.js";
import { discover } from "../discovery/discover.js";
import { OpenAIDecisions } from "../discovery/openai.js";
import {
  createDiscoverySession,
  createSession,
  type Session,
  safeResult,
} from "../services/session.js";

async function invocation(): Promise<{
  workflow: "savings" | "review";
  target: "northstar";
  goal: string;
  inputs: unknown;
}> {
  const argument = process.argv[2] ?? "savings";
  if (process.argv.length > 3) throw new RunError("INVALID_INPUT");
  if (argument === "--request") {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of process.stdin) {
      const bytes = Buffer.from(chunk as Uint8Array);
      size += bytes.length;
      if (size > 16_384) throw new RunError("INVALID_INPUT");
      chunks.push(bytes);
    }
    const request = z
      .strictObject({
        ...DiscoveryIntent.shape,
        workflow: z.enum(["savings", "review"]),
        inputs: z.unknown(),
      })
      .safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (!request.success) throw new RunError("INVALID_INPUT");
    return request.data;
  }
  if (argument !== "savings" && argument !== "review") throw new RunError("INVALID_INPUT");
  return {
    workflow: argument,
    target: "northstar" as const,
    goal: taskContracts[argument].description,
    inputs:
      argument === "savings"
        ? { memberId: "A1001" }
        : { memberId: "A1001", accountType: "checking", nickname: "Travel" },
  };
}
{
  let session: Session | undefined;
  let replaySession: Session | undefined;
  let target: Awaited<ReturnType<typeof startTarget>> | undefined;
  let canceled = false;
  const cancel = () => {
    canceled = true;
    session?.abort.abort();
    replaySession?.abort.abort();
    process.stdin.destroy();
  };
  process.once("SIGINT", cancel);
  process.once("SIGTERM", cancel);
  try {
    let request;
    try {
      request = await invocation();
    } catch {
      throw new RunError(canceled ? "CANCELED" : "INVALID_INPUT");
    }
    const { workflow } = request;
    const inputs = validateArguments(taskContracts[workflow], request.inputs);
    prepareGoal({ goal: request.goal, target: request.target }, taskContracts[workflow], inputs);
    if (canceled) throw new RunError("CANCELED");
    const sourceRevision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    target = await startTarget({ scenario: "normal" });
    session = await createDiscoverySession(workflow, inputs, sourceRevision, {
      intent: { goal: request.goal, target: request.target },
      origin: target.origin,
      directory: ".local/runs",
      activeTimeoutMs: 180_000,
    });
    if (canceled) session.abort.abort();
    console.log(JSON.stringify({ mode: "discovery", runId: session.runId }));
    const result = await discover(session, new OpenAIDecisions());
    console.log(JSON.stringify(safeResult(result, session.execution.capability)));
    if (result.status === "success") {
      const source = await readFile(join(session.directory, "capability.json"), "utf8");
      const memberId = inputs.memberId === "B1002" ? "A1001" : "B1002";
      const replayInputs =
        workflow === "savings"
          ? { memberId }
          : { memberId, accountType: "savings", nickname: "Reserve" };
      replaySession = await createSession(source, replayInputs, {
        origin: target.origin,
        directory: ".local/runs",
      });
      if (canceled) replaySession.abort.abort();
      const replayResult = await replaySession.replay();
      console.log(
        JSON.stringify({
          mode: "replay",
          result: safeResult(replayResult, replaySession.execution.capability),
          artifact: join(session.directory, "capability.json"),
        }),
      );
      if (replayResult.status !== "success") process.exitCode = 1;
    } else process.exitCode = 1;
  } catch (error) {
    console.error(JSON.stringify({ code: failureCode(error) }));
    process.exitCode = 1;
  } finally {
    process.removeListener("SIGINT", cancel);
    process.removeListener("SIGTERM", cancel);
    await replaySession?.close();
    await session?.close();
    await target?.close();
  }
}
