import { expect, test } from "@playwright/test";
import { startTarget } from "../../demo/server.js";

test("legacy UI supports a real search, member detail and savings lookup", async ({ page }) => {
  const target = await startTarget();
  try {
    await page.goto(target.origin);
    const frame = page.frameLocator('iframe[name="workspace"]');
    await frame
      .getByText("Member number", { exact: true })
      .locator("..")
      .locator("input")
      .fill("A1001");
    await frame.getByRole("button", { name: "Search members", exact: true }).click();
    await frame.getByRole("link", { name: "Open member", exact: true }).click();
    await frame.getByRole("link", { name: "View savings", exact: true }).click();
    await expect(
      frame.getByRole("heading", { name: "Savings account", exact: true }),
    ).toBeVisible();
    await expect(frame.getByText("$12,450.75", { exact: true })).toBeVisible();
    expect(target.stats.searches).toBe(1);
    expect(target.stats.commits).toBe(0);
    expect(await frame.locator("[data-testid]").count()).toBe(0);
  } finally {
    await target.close();
  }
});

test("account preparation reaches review without committing", async ({ page }) => {
  const target = await startTarget();
  try {
    await page.goto(target.origin);
    const frame = page.frameLocator('iframe[name="workspace"]');
    await frame
      .getByText("Member number", { exact: true })
      .locator("..")
      .locator("input")
      .fill("B1002");
    await frame.getByRole("button", { name: "Search members" }).click();
    await frame.getByRole("link", { name: "Open member" }).click();
    await frame.getByRole("link", { name: "New sub-account" }).click();
    await frame
      .getByText("Account nickname", { exact: true })
      .locator("..")
      .locator("input")
      .fill("Travel fund");
    await frame.getByRole("button", { name: "Review account" }).click();
    await expect(
      frame.getByRole("heading", { name: "Review sub-account", exact: true }),
    ).toBeVisible();
    await expect(frame.getByText("Travel fund", { exact: true })).toBeVisible();
    expect(target.stats.commits).toBe(0);
  } finally {
    await target.close();
  }
});

test("missing member is a visible business outcome", async ({ page }) => {
  const target = await startTarget();
  try {
    await page.goto(target.origin);
    const frame = page.frameLocator('iframe[name="workspace"]');
    await frame
      .getByText("Member number", { exact: true })
      .locator("..")
      .locator("input")
      .fill("MISSING");
    await frame.getByRole("button", { name: "Search members" }).click();
    await expect(frame.getByRole("heading", { name: "Member not found" })).toBeVisible();
  } finally {
    await target.close();
  }
});
