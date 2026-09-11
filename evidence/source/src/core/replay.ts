import type { Result } from "../contracts/runtime.js";
import type { Execution } from "./execution.js";

export async function replay(execution: Execution): Promise<Result> {
  let result: Result;
  try {
    await execution.journal.append({ type: "run-started" });
    await execution.wait(execution.capability.entry.conditions);
    for (const step of execution.capability.steps) await execution.step(step);
    result = await execution.successfulResult();
  } catch (error) {
    result = execution.resultFrom(error);
  }
  try {
    await execution.finish(result);
  } catch (error) {
    result = execution.resultFrom(error);
    await execution.ownership.finish();
  }
  return result;
}
