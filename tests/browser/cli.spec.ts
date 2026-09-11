import { spawn } from "node:child_process";
import { expect, test } from "@playwright/test";

function invoke(input: string, args: string[] = []) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const env = { ...process.env };
    delete env.OPENAI_API_KEY;
    delete env.FORCE_COLOR;
    const child = spawn(process.execPath, ["dist/src/cli/replay.js", ...args], { env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });
}

test("agent CLI returns one typed result without provider credentials", async () => {
  const result = await invoke('{"memberId":"B1002"}', ["--show-sensitive"]);
  expect(result.code).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.stdout.trim().split("\n")).toHaveLength(1);
  expect(JSON.parse(result.stdout)).toMatchObject({
    status: "success",
    outputs: { availableBalanceMinor: 823010, currency: "USD", accountType: "savings" },
  });
  const redacted = await invoke('{"memberId":"A1001"}');
  expect(redacted.code).toBe(0);
  expect(JSON.parse(redacted.stdout).outputs.availableBalanceMinor).toBe("[redacted]");
  const absent = await invoke('{"memberId":"A1001"}', ["--scenario", "not-found"]);
  expect(absent.code).toBe(2);
  expect(JSON.parse(absent.stdout)).toMatchObject({
    status: "business_outcome",
    code: "MEMBER_NOT_FOUND",
  });
});

test("agent CLI rejects malformed and oversized input without echoing it", async () => {
  for (const input of [
    '{"memberId":"PRIVATE-CANARY","unexpected":true}',
    '"' + "PRIVATE-CANARY".repeat(2000) + '"',
  ]) {
    const result = await invoke(input);
    expect(result.code).toBe(3);
    expect(JSON.parse(result.stdout)).toEqual({ status: "rejected", code: "INVALID_INPUT" });
    expect(result.stdout + result.stderr).not.toContain("PRIVATE-CANARY");
  }
});
