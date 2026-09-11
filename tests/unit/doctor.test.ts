import assert from "node:assert/strict";
import { test } from "node:test";
import { diagnose } from "../../src/cli/doctor.js";

test("replay readiness does not require provider credentials", () => {
  assert.equal(diagnose("v24.21.0", true, false).ready, true);
});

test("missing runtime or browser produces actionable setup guidance", () => {
  const result = diagnose("v20.0.0", false, true);
  assert.equal(result.ready, false);
  assert.equal(result.instructions.length, 2);
  assert.match(result.instructions.join(" "), /yarn setup/);
});
