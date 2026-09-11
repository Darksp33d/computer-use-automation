import { expect, test } from "@playwright/test";
import { startTarget } from "../../demo/server.js";
import {
  bankActions,
  bankMarkers,
  bankRoutes,
  bankTargets,
} from "../../src/applications/legacy-bank.js";
import { Policy } from "../../src/core/policy.js";
import { BrowserSurface } from "../../src/surfaces/browser.js";

test("surface resolves legacy fields and emits safe structural observations", async () => {
  const target = await startTarget();
  const policy = new Policy(target.origin, {
    targets: bankTargets,
    routes: bankRoutes,
    actions: bankActions,
  });
  const inputs = { memberId: "PRIVATE-CANARY" };
  const surface = await BrowserSurface.create(policy, inputs, bankMarkers);
  try {
    const before = await surface.observe();
    expect(before.screen).toBe("search-screen");
    expect(before.controls.find((control) => control.id === "member-number")?.visible).toBe(false);
    await surface.act(
      { kind: "fill", target: "member-field", input: "memberId" },
      inputs,
      "automation",
    );
    expect(
      await surface.check({ kind: "equalsInput", target: "member-field", input: "memberId" }),
    ).toBe(true);
    const after = await surface.observe();
    expect(after.generation).toBeGreaterThan(before.generation);
    expect(JSON.stringify(after)).not.toContain(inputs.memberId);
    await surface.act({ kind: "click", target: "search-members" }, inputs, "automation");
    expect((await surface.observe()).state).toEqual({ kind: "business", code: "MEMBER_NOT_FOUND" });
  } finally {
    await surface.close();
    await target.close();
  }
});

test("duplicate controls stop before an observable search effect", async () => {
  const target = await startTarget({ scenario: "ambiguous" });
  const policy = new Policy(target.origin, {
    targets: bankTargets,
    routes: bankRoutes,
    actions: bankActions,
  });
  const surface = await BrowserSurface.create(policy, { memberId: "A1001" }, bankMarkers);
  try {
    await expect(
      surface.act({ kind: "click", target: "search-members" }, {}, "automation"),
    ).rejects.toThrow("TARGET_AMBIGUOUS");
    expect(target.stats.searches).toBe(0);
  } finally {
    await surface.close();
    await target.close();
  }
});

test("changed frame binding cannot silently redirect control", async () => {
  const target = await startTarget({ scenario: "frame-drift" });
  try {
    const policy = new Policy(target.origin, {
      targets: bankTargets,
      routes: bankRoutes,
      actions: bankActions,
    });
    await expect(
      BrowserSurface.create(policy, { memberId: "A1001" }, bankMarkers, { timeoutMs: 200 }),
    ).rejects.toThrow("UNSUPPORTED_BINDING");
  } finally {
    await target.close();
  }
});
