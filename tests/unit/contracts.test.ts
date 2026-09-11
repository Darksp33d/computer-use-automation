import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCapability, parseOutput, validateArguments } from "../../src/contracts/validate.js";
import { fixtureCapability } from "../fixtures/capability.js";

test("capability round trip preserves its public contract", () => {
  const capability = fixtureCapability();
  assert.deepEqual(parseCapability(JSON.stringify(capability)), capability);
});

test("unknown schema versions, fields and executable actions are rejected", () => {
  const source = fixtureCapability();
  for (const invalid of [
    { ...source, schemaVersion: 2 },
    { ...source, script: "fetch('/secret')" },
    { ...source, steps: [{ ...source.steps[0], action: { kind: "eval", code: "alert(1)" } }] },
  ]) {
    assert.throws(() => parseCapability(JSON.stringify(invalid)), /INVALID_ARTIFACT/);
  }
});

test("dangling references, duplicate steps and missing declared outputs fail before execution", () => {
  const a = fixtureCapability();
  a.steps[0]!.action.target = "missing";
  const b = fixtureCapability();
  b.steps.push(b.steps[0]!);
  const c = fixtureCapability();
  c.steps[0]!.action = { kind: "click", target: "balance" };
  for (const source of [a, b, c])
    assert.throws(() => parseCapability(JSON.stringify(source)), /INVALID_ARTIFACT/);
});

test("oversized or deeply malformed input does not escape safe artifact errors", () => {
  for (const source of ["x".repeat(128_001), "[".repeat(10_000), "null", "{}", "not json"]) {
    assert.throws(() => parseCapability(source), /INVALID_ARTIFACT/);
  }
});

test("arguments reject unknown keys and type coercion without echoing sensitive input", () => {
  const definition = fixtureCapability();
  assert.deepEqual(validateArguments(definition, { memberId: "member-b" }), {
    memberId: "member-b",
  });
  for (const value of [{ memberId: 123 }, {}, { memberId: "secret-canary", extra: true }]) {
    assert.throws(() => validateArguments(definition, value), { message: "INVALID_INPUT" });
  }
});

test("currency parsing preserves minor units and rejects ambiguity and overflow", () => {
  const output = fixtureCapability().outputs.balance!;
  assert.equal(parseOutput(output, "$12,345.67"), 1234567);
  assert.equal(parseOutput(output, "$0.01"), 1);
  for (const value of ["$1,23.45", "€12.00", "$1.999", "$01.00", "NaN", "$9999999999999999.99"]) {
    assert.throws(() => parseOutput(output, value), /OUTPUT_INVALID/);
  }
});
