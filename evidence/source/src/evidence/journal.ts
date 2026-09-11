import { type FileHandle, mkdir, open } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { Identifier } from "../contracts/capability.js";
import { failureCodes, RunError } from "../contracts/errors.js";

const EventPayload = z.strictObject({
  type: z.enum([
    "run-started",
    "action-intent",
    "action-completed",
    "action-failed",
    "checkpoint",
    "recovery",
    "intervention",
    "control-changed",
    "model-decision",
    "run-finished",
  ]),
  stepId: Identifier.optional(),
  target: Identifier.optional(),
  action: z.enum(["click", "fill", "select", "read", "dismiss-dialog"]).optional(),
  actor: z.enum(["automation", "local-operator"]).optional(),
  epoch: z.int().nonnegative().optional(),
  code: z
    .enum([...failureCodes, "MEMBER_NOT_FOUND", "ACCOUNT_NOT_FOUND", "VALIDATION_REJECTED"])
    .optional(),
  status: z.enum(["success", "business_outcome", "failure", "canceled"]).optional(),
  reason: z
    .enum([
      "goal-step",
      "checkpoint",
      "known-recovery",
      "operator-request",
      "intervention",
      "completed",
      "rejected",
      "provider-decision",
    ])
    .optional(),
  provider: z
    .strictObject({
      model: z.string().regex(/^[a-zA-Z0-9.-]{1,80}$/),
      responseId: z.string().regex(/^[a-zA-Z0-9_-]{1,160}$/),
      inputTokens: z.int().nonnegative(),
      outputTokens: z.int().nonnegative(),
    })
    .optional(),
});

export type EventPayload = z.infer<typeof EventPayload>;
export type RunEvent = EventPayload & { seq: number; runId: string; at: string };

export class Journal {
  readonly events: RunEvent[] = [];
  #tail: Promise<unknown> = Promise.resolve();
  #failed = false;
  #bytes = 0;

  private constructor(
    readonly runId: string,
    private readonly file: FileHandle,
  ) {}

  static async create(directory: string, runId: string) {
    if (!z.uuid().safeParse(runId).success) throw new RunError("EVIDENCE_UNAVAILABLE");
    try {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      return new Journal(runId, await open(join(directory, "events.jsonl"), "wx", 0o600));
    } catch {
      throw new RunError("EVIDENCE_UNAVAILABLE");
    }
  }

  append(payload: EventPayload): Promise<RunEvent> {
    const result = this.#tail.then(async () => {
      if (this.#failed || this.events.length >= 2000) throw new RunError("EVIDENCE_UNAVAILABLE");
      const parsed = EventPayload.safeParse(payload);
      if (!parsed.success) throw new RunError("EVIDENCE_UNAVAILABLE");
      const event = {
        ...parsed.data,
        seq: this.events.length + 1,
        runId: this.runId,
        at: new Date().toISOString(),
      };
      const line = `${JSON.stringify(event)}\n`;
      this.#bytes += Buffer.byteLength(line);
      if (this.#bytes > 1_048_576) throw new RunError("EVIDENCE_UNAVAILABLE");
      try {
        await this.file.appendFile(line);
        await this.file.sync();
      } catch {
        throw new RunError("EVIDENCE_UNAVAILABLE");
      }
      this.events.push(event);
      return event;
    });
    this.#tail = result.catch(() => {
      this.#failed = true;
    });
    return result;
  }

  async close() {
    await this.#tail;
    await this.file.close();
  }
}
