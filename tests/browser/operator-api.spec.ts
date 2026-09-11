import { expect, test } from "@playwright/test";
import { setupOperator as setup } from "../fixtures/operator.js";

test("operator API rejects missing credentials, cross-origin commands and invalid bodies", async ({
  request,
}) => {
  const app = await setup();
  try {
    expect((await request.get(`${app.server.origin}/api/workspace`)).status()).toBe(401);
    const headers = {
      Authorization: `Bearer ${app.server.token}`,
      "Content-Type": "application/json",
    };
    expect(
      (
        await request.post(`${app.server.origin}/api/runs`, {
          headers: { ...headers, Origin: "http://attacker.invalid" },
          data: {},
        })
      ).status(),
    ).toBe(403);
    expect(
      (await request.post(`${app.server.origin}/api/runs`, { headers, data: {} })).status(),
    ).toBe(403);
    expect(
      (
        await request.post(`${app.server.origin}/api/runs`, {
          headers: { ...headers, Origin: app.server.origin },
          data: { unexpected: true },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await request.post(`${app.server.origin}/api/runs`, {
          headers: { ...headers, Origin: app.server.origin },
          data: { oversized: "x".repeat(20_000) },
        })
      ).status(),
    ).toBe(400);
    expect((await app.manager.workspace()).runs).toHaveLength(0);
  } finally {
    await app.close();
  }
});

test("shutdown waits for an admitted session startup and leaves no active run", async () => {
  const app = await setup();
  try {
    const starting = app.manager.start({
      workflow: "savings",
      mode: "replay",
      scenario: "normal",
      inputs: { memberId: "A1001" },
    });
    const results = await Promise.allSettled([starting, app.manager.close()]);
    expect(results[0]).toMatchObject({ status: "rejected", reason: { message: "CANCELED" } });
    expect((await app.manager.workspace()).runs).toHaveLength(0);
  } finally {
    await app.close();
  }
});
