import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { OpenAIDecisions } from "../../src/discovery/openai.js";
import { setupOperator as setup } from "../fixtures/operator.js";

test("production React console completes exclusive handoff through visible controls", async ({
  page,
}) => {
  const app = await setup();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.name));
  try {
    await page.goto(app.server.url);
    expect(page.url()).toBe(`${app.server.origin}/`);
    await page.getByRole("button", { name: "New session", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "New session" })).toBeVisible();
    await page
      .getByRole("combobox", { name: "Scenario", exact: true })
      .selectOption("intervention");
    await page.getByRole("button", { name: "Start session", exact: true }).click();
    await page.getByRole("button", { name: "Take control", exact: true }).click();
    await page.getByRole("button", { name: "Acknowledge notice", exact: true }).click();
    await expect(page.getByRole("button", { name: "Acknowledge notice", exact: true })).toHaveCount(
      0,
    );
    await page.getByRole("button", { name: "Verify & resume", exact: true }).click();
    // This waits for the remaining workflow, not a single UI render.
    await expect(page.getByRole("status")).toHaveText("Completed", { timeout: 20_000 });
    await expect(page.getByText("$12,450.75", { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      accessibility.violations.map((item) => ({
        id: item.id,
        nodes: item.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
    expect(
      (await app.manager.workspace()).runs[0]?.events.some(
        (event) => event.actor === "local-operator" && event.type === "action-completed",
      ),
    ).toBe(true);
  } finally {
    await app.close();
  }
});

test("narrow console preserves an edited form through refresh and supports keyboard dismissal", async ({
  page,
}) => {
  const app = await setup();
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(app.server.url);
    await page.getByRole("button", { name: "New session", exact: true }).click();
    await page.getByRole("combobox", { name: "Workflow", exact: true }).selectOption("review");
    const field = page.getByRole("textbox", { name: "Account nickname", exact: true });
    await field.fill("Custom draft");
    await expect
      .poll(async () => (await app.manager.workspace()).capabilities.length)
      .toBeGreaterThan(0);
    await page.waitForTimeout(1800);
    await expect(field).toHaveValue("Custom draft");
    await expect(field).toBeFocused();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  } finally {
    await app.close();
  }
});

test("mobile discovery submits the edited goal and target to the provider", async ({ page }) => {
  const app = await setup();
  const priorKey = process.env.OPENAI_API_KEY;
  const decide = OpenAIDecisions.prototype.decide;
  process.env.OPENAI_API_KEY = "test-only";
  const goal = "Delete the member record instead of reading a balance.";
  OpenAIDecisions.prototype.decide = async (view) => {
    expect(view.goal).toBe(goal);
    expect(view.target).toBe("northstar");
    return {
      decision: { kind: "unsupported", action: null },
      metadata: { model: "test-fixture", responseId: "fixture", inputTokens: 1, outputTokens: 1 },
    };
  };
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(app.server.url);
    await page.getByRole("button", { name: "New session", exact: true }).click();
    await page.getByRole("radio", { name: /^Discover/ }).check();
    await page
      .getByRole("combobox", { name: "Target application", exact: true })
      .selectOption("northstar");
    const field = page.getByRole("textbox", { name: "Goal", exact: true });
    await field.fill(goal);
    await page.waitForResponse((response) => response.url().endsWith("/api/workspace"));
    await expect(field).toHaveValue(goal);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
    await page.getByRole("button", { name: "Start session", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Stopped", { timeout: 20000 });
    await expect(page.getByText("goal unsupported", { exact: true })).toBeVisible();
    expect((await app.manager.workspace()).runs[0]).toMatchObject({
      code: "GOAL_UNSUPPORTED",
      canApprove: false,
    });
  } finally {
    await app.close();
    OpenAIDecisions.prototype.decide = decide;
    if (priorKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = priorKey;
  }
});
