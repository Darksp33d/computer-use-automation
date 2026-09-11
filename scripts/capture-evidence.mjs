import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cp, mkdir, readFile, rename } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { expect } from "@playwright/test";
import { chromium } from "playwright";
import { writeNewJson } from "../dist/src/evidence/files.js";
import { RunManager } from "../dist/src/operator/manager.js";
import { startOperator } from "../dist/src/operator/server.js";
import { Catalog } from "../dist/src/services/catalog.js";

assert.ok(process.env.OPENAI_API_KEY, "Configure OPENAI_API_KEY privately before capture");
assert.equal(
  execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
  "",
  "Commit or preserve outstanding changes before capturing final evidence",
);
const sourceRevision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const directory = resolve(".local/submission", randomUUID());
await mkdir(directory, { recursive: true, mode: 0o700 });
await cp("capabilities", join(directory, "catalog"), { recursive: true });
const catalog = new Catalog(join(directory, "catalog"));
const manager = new RunManager(catalog, join(directory, "runs"), sourceRevision);
const server = await startOperator(manager, { assets: resolve("dist/ui") });
const browser = await chromium.launch({
  env: Object.fromEntries(
    Object.entries(process.env).filter(
      ([key, value]) => ["PATH", "HOME", "TMPDIR", "LANG"].includes(key) && value !== undefined,
    ),
  ),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  recordVideo: { dir: directory, size: { width: 1440, height: 960 } },
});
const page = await context.newPage();
const video = page.video();
const prompt = createInterface({ input: process.stdin, output: process.stdout });
const canceled = new AbortController();
const cancel = () => {
  canceled.abort();
  void server.close().catch(() => {
    process.exitCode = 1;
  });
};
process.once("SIGINT", cancel);
process.once("SIGTERM", cancel);
const capture = {
  sourceRevision,
  sourceDirty: false,
  startedAt: new Date().toISOString(),
  node: process.version,
  browser: browser.version(),
  model: "gpt-6-astra",
  command: "node --env-file-if-exists=.env.local scripts/capture-evidence.mjs",
  operator: "Development agent: scripted browser controls with explicit artifact review",
  data: "Fictional Northstar records only. Console output is synthetic; runtime journals are redacted.",
  runs: [],
  browserErrors: [],
};
page.on("pageerror", (error) => capture.browserErrors.push(error.name));
async function current() {
  return (await manager.workspace()).runs[0];
}
async function screenshot(name) {
  const run = await current();
  if (run && run.owner !== "automation") {
    const expected = await manager.image(run.id);
    if (expected) {
      await expect
        .poll(
          async () => {
            const image = page.locator(".screen-content img");
            if ((await image.count()) !== 1) return false;
            const bytes = await image.evaluate(async (element) =>
              Array.from(new Uint8Array(await (await fetch(element.currentSrc)).arrayBuffer())),
            );
            return Buffer.from(bytes).equals(expected);
          },
          { timeout: 10_000 },
        )
        .toBe(true);
    }
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(directory, `${name}.png`), fullPage: true });
}
async function launch(workflow, mode, scenario = "normal", member = "A1001") {
  await page.getByRole("button", { name: "New session", exact: true }).click();
  await page.getByRole("combobox", { name: "Workflow", exact: true }).selectOption(workflow);
  if (mode === "discovery") await page.getByRole("radio", { name: /^Discover/ }).check();
  await page.getByRole("combobox", { name: "Scenario", exact: true }).selectOption(scenario);
  await page.getByRole("combobox", { name: "Member number", exact: true }).selectOption(member);
  if (workflow === "review")
    await page
      .getByRole("combobox", { name: "Account type", exact: true })
      .selectOption("checking");
  const previous = (await current())?.id;
  await page.getByRole("button", { name: "Start session", exact: true }).click();
  await expect.poll(async () => (await current())?.id).not.toBe(previous);
  const run = await current();
  capture.runs.push({ id: run.id, workflow, mode, scenario, syntheticMember: member });
  console.log(JSON.stringify({ started: run.id, workflow, mode, scenario }));
  return run.id;
}
async function completed(expected) {
  await expect
    .poll(async () => ["running", "validating"].includes((await current()).phase), {
      timeout: 210_000,
    })
    .toBe(false);
  const run = await current();
  assert.equal(run.phase, expected);
  const entry = capture.runs.find((item) => item.id === run.id);
  entry.status = run.phase;
  entry.code = run.code;
  await expect(page.getByRole("status")).toHaveText(
    { success: "Completed", failure: "Stopped", business_outcome: "Business outcome" }[expected],
  );
  return run;
}
try {
  await page.goto(server.url);
  await expect(page.getByRole("button", { name: "New session", exact: true })).toBeEnabled();
  await screenshot("sessions");
  await page.getByRole("button", { name: "New session", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot("mobile-session-dialog");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 960 });
  for (const workflow of ["savings", "review"]) {
    const id = await launch(workflow, "discovery");
    const run = await completed("success");
    assert.equal(run.canApprove, true);
    await screenshot(`${workflow}-discovery`);
    await page.getByRole("button", { name: "Review capability", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: "Review capability", exact: true }),
    ).toBeVisible();
    await screenshot(`${workflow}-contract-review`);
    const artifactPath = join(directory, "runs", id, "capability.json");
    console.log(`Review the complete artifact at ${artifactPath}`);
    assert.equal(
      (await prompt.question("Enter approve after review: ", { signal: canceled.signal })).trim(),
      "approve",
    );
    await page.getByRole("button", { name: "Approve this revision", exact: true }).click();
    await expect.poll(async () => (await current()).approved).toBe(true);
    const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
    const approval = JSON.parse(
      await readFile(
        join(directory, "catalog", `${artifact.id}-${artifact.revision}.approval.json`),
        "utf8",
      ),
    );
    Object.assign(
      capture.runs.find((item) => item.id === id),
      {
        capabilityId: artifact.id,
        revision: artifact.revision,
        validationRunId: approval.replayRunId,
        approved: true,
      },
    );
  }
  // Replay is independently exercised after removing the provider credential.
  delete process.env.OPENAI_API_KEY;
  for (const workflow of ["savings", "review"]) {
    await launch(workflow, "replay", "normal", "B1002");
    const run = await completed("success");
    if (workflow === "savings")
      assert.equal(
        run.outputs.find((item) => item.name === "availableBalanceMinor")?.value,
        "823010",
      );
    else
      assert.equal(
        run.outputs.find((item) => item.name === "preparationStatus")?.value,
        "ready-for-review",
      );
    await screenshot(`${workflow}-replay`);
  }
  await launch("savings", "replay", "not-found");
  assert.equal((await completed("business_outcome")).code, "MEMBER_NOT_FOUND");
  await screenshot("member-not-found");
  await launch("savings", "replay", "malformed-balance");
  assert.equal((await completed("failure")).code, "OUTPUT_INVALID");
  await screenshot("malformed-balance");
  await launch("savings", "replay", "intervention");
  await page.getByRole("button", { name: "Take control", exact: true }).waitFor();
  await screenshot("handoff-paused");
  await page.getByRole("button", { name: "Take control", exact: true }).click();
  await page.getByRole("button", { name: "Acknowledge notice", exact: true }).waitFor();
  await screenshot("handoff-claimed");
  await page.getByRole("button", { name: "Acknowledge notice", exact: true }).click();
  await page.getByRole("button", { name: "Verify & resume", exact: true }).click();
  await completed("success");
  await screenshot("handoff-completed");
  assert.deepEqual(capture.browserErrors, []);
  capture.status = "success";
} catch (error) {
  capture.status = "failed";
  capture.errorClass = error.name;
  process.exitCode = 1;
  console.error("Capture failed. Preserve this attempt and inspect its safe run records.");
} finally {
  prompt.close();
  process.removeListener("SIGINT", cancel);
  process.removeListener("SIGTERM", cancel);
  await context.close();
  await rename(await video.path(), join(directory, "walkthrough.webm"));
  await browser.close();
  await server.close();
  capture.completedAt = new Date().toISOString();
  await writeNewJson(join(directory, "capture.json"), capture);
  console.log(JSON.stringify({ capture: directory, status: capture.status }));
}
