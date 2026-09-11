# Scale, tenant reuse and operations

Status: deployment design, not implemented infrastructure or measured capacity.

## 1. Define concurrency before choosing infrastructure

The user-facing platform can serve millions of connected users while only a fraction are waiting for UI automation. A browser workflow occupies a stateful session for seconds or minutes. A back-office application may support only a few concurrent logins. Its concurrency limit constrains useful throughput regardless of the calling platform's size.

Use `active sessions = admitted workflows per second × average session duration` as an initial steady-state capacity model. Include human-wait occupancy separately. For an illustrative workload of 1,000 admitted workflows/second averaging 30 seconds, there are approximately 30,000 active sessions. If measurement later finds 250 MiB per isolated session, that implies about 7.2 TiB of memory before worker/platform overhead. One million simultaneous sessions at that assumed footprint would need about 238 TiB. These are arithmetic scenarios, not measurements or a resource recommendation.

If 0.5% of 1,000 workflows/second escalate and operators need an average of 120 seconds, about 600 sessions remain waiting for human work in steady state, before queueing delays. Operator capacity, credentials, vendor login limits and admission control are as important as CPU. The system must reject or queue excess work honestly rather than letting unlimited promises and browsers accumulate.

Before deployment, measure workflow arrival distribution, burst size, browser RSS/CPU, cold start, execution duration, tenant/vendor concurrency caps, outcome frequency, handoff rate/duration and evidence volume. Specify whether the product promises queue admission, completion latency, availability, or all three.

## 2. Proposed deployment boundaries

| Component | Responsibility | Why it is separate at scale |
| --- | --- | --- |
| Authenticated control API | Tenant identity, capability authorization, input validation, invocation status/cancellation | Stateless horizontal scaling; authenticated identity determines tenant scope |
| Capability registry | Immutable artifacts, approved revisions, binding compatibility and revocation | Prevents an execution worker from silently changing what was approved |
| Admission and scheduler | Bounded queues, fairness, per-tenant/vendor/account quotas, deadlines | Protects legacy systems and prevents a noisy tenant exhausting workers |
| Session worker | One owned execution session, action policy, browser/desktop driver, handoff | Keeps stateful effects with the process holding the actual UI session |
| Operator gateway | SSO/RBAC, tenant-authorized claim, short-lived session access and safe action channel | Gives people access to the right live session without exposing worker credentials |
| Evidence store | Tenant-isolated metadata, safe structured events, approved encrypted attachments and retention | Audit access and retention differ from execution lifecycle |
| Discovery service | Rate/cost-limited model-assisted learning and review workflow | Provider failures or discovery load must not affect deterministic replay capacity |

A durable database is appropriate for invocation metadata, approvals and lease generations. A durable queue supplies at-least-once delivery and bounded admission. An object store holds approved evidence. PostgreSQL plus a managed queue and object store is a reasonable starting deployment shape, but specific products are not needed for the local core and will be selected against measured operational requirements.

Workers run in tenant-isolated containers or VMs with restricted egress, resource quotas, no host workspace mounts and least-privilege secrets. Native desktop applications need an actual managed OS session, potentially a Windows VM per session or allowed pool, with its own licensing and access-control constraints. A browser context or OS username alone is not a sufficient hostile-tenant boundary.

## 3. Ownership, retries and lost workers

Persist invocation status and a monotonically increasing session lease generation. Distributed claims require an atomic compare-and-set operation. Every worker and operator command includes that generation. A session action gateway rejects stale owners even if they continue running after losing their lease. A database lease alone does not physically stop an old browser from acting; the enforcing gateway or worker termination must close that gap.

The queue may deliver the same job twice. Deduplicate admission using `(tenant, idempotency key)` and bind that key to an input digest held under an appropriate data policy. The same key with different inputs is a conflict. This deduplicates invocations; it does not make arbitrary UI actions exactly once.

If a worker dies, mark its run interrupted and its last dispatched effect as unknown unless independent evidence resolves it. Quarantine or terminate the old session before replacement. Never replay a potentially committed write solely because a lease expired. Read-only jobs may be restarted under an explicit policy and original deadline. Write jobs need reconciliation or human review. Business compensation requires explicit domain knowledge, not generic "undo" automation.

Human takeover remains pinned to the worker with the original live session. Do not migrate a browser by exporting cookies and calling it the same session. Draining workers stop accepting jobs but preserve active handoffs until their deadline. Fleet upgrades must support the old artifact/driver versions until in-flight runs finish.

## 4. Reuse across institutions

Separate three immutable, versioned objects:

1. Capability: business intent, typed contract, ordered logical actions, conditions and supported application family.
2. Vendor binding: control resolution, route names, error markers, effect classifications and supported product versions/locales.
3. Tenant binding: concrete origin, permitted route mapping, branding/label overrides and explicitly permitted specialization.

Tenant specialization may narrow policy or change declared control/route mappings. It cannot silently change business steps, output meaning, success criteria or elevate permissions. Those changes need a new reviewed capability revision. Validate the merged effective binding and pin its digest for each run. Production catalog lookups derive tenant identity from authentication, never solely from caller-provided strings.

Compatibility checks use the required binding/driver features and observable screen/control anchors. A full screenshot hash is too sensitive to balances, names and benign rendering differences. On mismatch, stop and quarantine that binding revision for affected tenants. Do not "self-heal" unattended by asking a model to click something else. Run a small canary replay suite before expanding a new vendor binding, then roll out by tenant cohorts with an immediate revision rollback path. An artifact rollback changes future execution; it cannot reverse effects already performed.

Track results by capability/binding revision and tenant under access controls. Avoid member IDs, raw URLs and run IDs as metric labels. Drift should identify whether the shared vendor binding or a tenant override needs revision. The local implementation demonstrates the legacy binding seam; a second branded tenant variant is deferred unless every core gate already passes.

## 5. Operational readiness gates

These gates are mandatory before claiming production service at scale:

- Define service-level objectives separately for admission latency, queue wait, execution latency, successful technical execution and human wait. Legitimate not-found results are not technical failures.
- Benchmark progressively at 1, 10, 100 and larger isolated sessions using authorized fixtures; then load-test admission independently from expensive browsers. Publish saturation, p50/p95/p99, failure distribution and resource use.
- Enforce queue bounds, tenant fairness, vendor session limits, circuit breakers for failing apps, deadlines and cancellation propagation before adding more workers.
- Validate tenant isolation, secret brokering, operator SSO/RBAC, egress enforcement, encrypted storage, redaction, retention and audit access with the actual deployment topology.
- Exercise worker death, duplicate delivery, lease split-brain, operator disconnect, queue outage, registry outage, evidence-store failure and regional loss. Verify safe behavior rather than only restart time.
- Test backup restoration, registry integrity, audit export, key rotation and data deletion. Define RPO/RTO with the business and prove them through recovery exercises.
- Maintain dependency/browser/OS patching, image provenance, vulnerability handling and staged rollout. Disable affected capabilities centrally when a vendor incident or safety issue occurs.

No initial SLO percentage or million-session throughput is claimed without these measurements. The local core's most valuable scaling property is that it keeps model inference off the high-volume replay path while preserving explicit contracts and ownership.
