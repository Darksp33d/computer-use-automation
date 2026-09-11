import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { startTarget } from "../../demo/server.js";
import { failureCode } from "../contracts/errors.js";
import { discover } from "../discovery/discover.js";
import { OpenAIDecisions } from "../discovery/openai.js";
import {
  createDiscoverySession,
  createSession,
  type Session,
  safeResult,
} from "../services/session.js";

const workflow = process.argv[2] ?? "savings";
if (!["savings", "review"].includes(workflow)) {
  console.error("Usage: yarn discover [savings|review]");
  process.exitCode = 2;
} else {
  let session: Session | undefined;
  let replaySession: Session | undefined;
  const target = await startTarget({ scenario: "normal" });
  try {
    const sourceRevision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const inputs =
      workflow === "savings"
        ? { memberId: "A1001" }
        : { memberId: "A1001", accountType: "checking", nickname: "Travel" };
    session = await createDiscoverySession(
      workflow as "savings" | "review",
      inputs,
      sourceRevision,
      {
        origin: target.origin,
        directory: ".local/runs",
        activeTimeoutMs: 180_000,
      },
    );
    const cancel = () => session?.abort.abort();
    process.once("SIGINT", cancel);
    process.once("SIGTERM", cancel);
    console.log(JSON.stringify({ mode: "discovery", runId: session.runId }));
    const result = await discover(session, new OpenAIDecisions());
    console.log(JSON.stringify(safeResult(result, session.execution.capability)));
    if (result.status === "success") {
      const source = await readFile(join(session.directory, "capability.json"), "utf8");
      const replayInputs =
        workflow === "savings"
          ? { memberId: "B1002" }
          : { memberId: "B1002", accountType: "savings", nickname: "Reserve" };
      replaySession = await createSession(source, replayInputs, {
        origin: target.origin,
        directory: ".local/runs",
      });
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
    process.removeListener("SIGINT", cancel);
    process.removeListener("SIGTERM", cancel);
  } catch (error) {
    console.error(JSON.stringify({ code: failureCode(error) }));
    process.exitCode = 1;
  } finally {
    await replaySession?.close();
    await session?.close();
    await target.close();
  }
}
