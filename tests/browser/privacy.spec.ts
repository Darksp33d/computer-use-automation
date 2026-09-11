import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { startTarget } from "../../demo/server.js";
import { createSession } from "../../src/services/session.js";
import { fixtureFlow } from "../fixtures/flows.js";

test("CSP-protected screenshots are identical across different private review values", async () => {
  const directory = await mkdtemp(join(tmpdir(), "privacy-check-"));
  const target = await startTarget();
  const images: Buffer[] = [];
  try {
    for (const inputs of [
      { memberId: "A1001", accountType: "savings", nickname: "CANARY-PRIVATE-ALPHA" },
      { memberId: "B1002", accountType: "checking", nickname: "DIFFERENT-SECRET-BETA" },
    ]) {
      const session = await createSession(JSON.stringify(fixtureFlow("review")), inputs, {
        origin: target.origin,
        directory,
      });
      try {
        expect((await session.replay()).status).toBe("success");
        const image = await session.surface.screenshot();
        expect(image).not.toBeNull();
        images.push(image!);
      } finally {
        await session.close();
      }
    }
    expect(images[0]!.equals(images[1]!)).toBe(true);
  } finally {
    await target.close();
    await rm(directory, { recursive: true, force: true });
  }
});
