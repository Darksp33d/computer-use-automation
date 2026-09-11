import assert from "node:assert/strict";
import { test } from "node:test";
import { bankActions, bankRoutes, bankTargets } from "../../src/applications/legacy-bank.js";
import { Policy } from "../../src/core/policy.js";

const policy = new Policy("http://127.0.0.1:4174", {
  targets: bankTargets,
  routes: bankRoutes,
  actions: bankActions,
});

test("request policy checks origin, route and method before any request", () => {
  assert.equal(policy.permitsRequest("http://127.0.0.1:4174/find", "POST"), true);
  for (const [url, method] of [
    ["http://127.0.0.1:4174/commit", "POST"],
    ["http://127.0.0.1:4174/find", "GET"],
    ["http://127.0.0.1:4175/", "GET"],
    ["http://user:secret@127.0.0.1:4174/", "GET"],
    ["http://127.0.0.1:4174/?secret=value", "GET"],
    ["file:///etc/passwd", "GET"],
    ["javascript:alert(1)", "GET"],
  ]) {
    assert.equal(policy.permitsRequest(url!, method!), false);
  }
});

test("model and human cannot grant themselves risky actions or wrong parameter bindings", () => {
  for (const actor of ["automation", "human"] as const) {
    assert.throws(
      () => policy.authorize({ kind: "click", target: "open-account" }, actor),
      /POLICY_DENIED/,
    );
    assert.throws(
      () => policy.authorize({ kind: "fill", target: "member-field", input: "nickname" }, actor),
      /POLICY_DENIED/,
    );
  }
  assert.throws(
    () => policy.authorize({ kind: "click", target: "acknowledge-notice" }, "automation"),
    /POLICY_DENIED/,
  );
  assert.equal(policy.authorize({ kind: "click", target: "acknowledge-notice" }, "human"), "read");
});
