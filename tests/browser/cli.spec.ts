import { spawn } from "node:child_process";
import { expect, test } from "@playwright/test";

function invoke(input: string, args: string[] = [], entry = "replay") {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const env = { ...process.env };
    delete env.OPENAI_API_KEY;
    delete env.FORCE_COLOR;
    const child = spawn(
      process.execPath,
      ["--import", "./tests/fixtures/no-provider.mjs", `dist/src/cli/${entry}.js`, ...args],
      { env },
    );
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

test("CLI failure returns safe expected and observed context", async () => {
  const result = await invoke('{"memberId":"A1001"}', ["--scenario", "malformed-balance"]);
  expect(result.code).toBe(3);
  expect(JSON.parse(result.stdout)).toMatchObject({
    status: "failure",
    code: "OUTPUT_INVALID",
    diagnostic: {
      stage: "execution",
      expected: { output: { name: "availableBalanceMinor", parser: "usd-minor" } },
      observed: { screen: "savings-screen", state: "ready" },
    },
  });
  expect(result.stdout).not.toContain("A1001");
});

test("discovery CLI rejects unsafe goals and unknown targets before provider access", async () => {
  for (const request of [
    { workflow: "savings", inputs: { memberId: "A1001" } },
    {
      workflow: "savings",
      target: "https://example.com",
      goal: "Read the savings balance.",
      inputs: { memberId: "A1001" },
    },
    {
      workflow: "savings",
      target: "northstar",
      goal: "Use PRIVATE-CANARY-123 as the password.",
      inputs: { memberId: "A1001" },
    },
  ]) {
    const result = await invoke(JSON.stringify(request), ["--request"], "discover");
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(JSON.parse(result.stderr)).toEqual({ code: "INVALID_INPUT" });
    expect(result.stderr).not.toContain("PRIVATE-CANARY");
  }
});
