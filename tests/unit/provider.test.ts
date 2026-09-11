import assert from "node:assert/strict";
import { test } from "node:test";
import { taskContracts } from "../../src/applications/legacy-bank.js";
import { OpenAIDecisions } from "../../src/discovery/openai.js";
import type { DiscoveryView } from "../../src/discovery/provider.js";

const view: DiscoveryView = {
  goal: "Read the savings balance for {memberId}.",
  target: "northstar",
  task: taskContracts.savings,
  observation: {
    generation: 1,
    screen: "search-screen",
    controls: [],
    conditions: [],
    state: { kind: "ready" },
  },
  controls: [],
  executed: [],
  collectedOutputs: [],
};

function response(content: unknown[], status = "completed") {
  return new Response(
    JSON.stringify({
      id: "resp_test_fixture",
      object: "response",
      model: "gpt-6-astra",
      status,
      output: [
        { id: "msg_fixture", type: "message", role: "assistant", status: "completed", content },
      ],
      usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 },
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}

test("official provider boundary sends references and classifies unsafe responses", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "TEST-KEY-CANARY";
  try {
    let captured = "";
    globalThis.fetch = async (input, init) => {
      captured = await new Request(input, init).text();
      return response([
        { type: "output_text", text: '{"kind":"finish","action":null}', annotations: [] },
      ]);
    };
    const result = await new OpenAIDecisions().decide(view, null, new AbortController().signal);
    assert.equal(result.decision.kind, "finish");
    assert.equal(JSON.parse(captured).store, false);
    assert.equal(JSON.parse(captured).service_tier, "default");
    assert.ok(!captured.includes("TEST-KEY-CANARY"));
    assert.ok(!captured.includes("A1001"));
    assert.equal(JSON.parse(JSON.parse(captured).input[0].content[0].text).goal, view.goal);
    for (const [reply, code] of [
      [response([{ type: "refusal", refusal: "PRIVATE-RESPONSE-CANARY" }]), "MODEL_REFUSED"],
      [response([], "incomplete"), "MODEL_INVALID"],
      [
        new Response(JSON.stringify({ error: { message: "PRIVATE-RESPONSE-CANARY" } }), {
          status: 429,
        }),
        "MODEL_UNAVAILABLE",
      ],
      [
        response([
          {
            type: "output_text",
            text: '{"kind":"execute-script","secret":"PRIVATE-RESPONSE-CANARY"}',
            annotations: [],
          },
        ]),
        "MODEL_INVALID",
      ],
    ] as const) {
      globalThis.fetch = async () => reply;
      await assert.rejects(
        new OpenAIDecisions().decide(view, null, new AbortController().signal),
        (error: unknown) => {
          assert.equal((error as Error).message, code);
          assert.ok(!String(error).includes("PRIVATE-RESPONSE-CANARY"));
          return true;
        },
      );
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test("provider abort distinguishes active-budget expiry from caller cancellation", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "TEST-KEY-CANARY";
  try {
    globalThis.fetch = async (input, init) => {
      const request = new Request(input, init);
      return new Promise((_resolve, reject) => {
        const guard = setTimeout(() => reject(new Error("FIXTURE_DID_NOT_ABORT")), 1000);
        const abort = () => {
          clearTimeout(guard);
          reject(request.signal.reason);
        };
        if (request.signal.aborted) abort();
        else request.signal.addEventListener("abort", abort, { once: true });
      });
    };
    await assert.rejects(
      new OpenAIDecisions().decide(view, null, AbortSignal.timeout(30)),
      /BUDGET_EXCEEDED/,
    );
    const canceled = new AbortController();
    canceled.abort();
    await assert.rejects(new OpenAIDecisions().decide(view, null, canceled.signal), /CANCELED/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});
