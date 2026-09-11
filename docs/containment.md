# Verified local containment profile

The optional profile runs the synthetic target and Chromium in separate non-root, read-only containers on an internal Docker network. It is a local verification boundary, not a deployed multitenant platform. Native `yarn demo` remains convenient for the synthetic application; arbitrary real targets are disabled.

```bash
corepack yarn build
node scripts/verify-containment.mjs
```

Docker must be running. The script builds pinned images, creates a uniquely named project, verifies its controls and tears down only that project in `finally`. It writes a sanitized summary and replay evidence under `.local/containment/`. The provider client remains on the host and is not used in this keyless check. No `.env`, key, host workspace or Docker socket is included in either worker. The Docker build context uses an explicit allowlist.

Chromium launches with its sandbox enabled. Both workers drop all host capabilities and use no-new-privileges. The browser has a 1 GiB memory limit, two CPUs, 128 PIDs, private shared memory and a bounded temporary filesystem. The target has a 128 MiB memory limit, half a CPU and 32 PIDs. A pinned upstream seccomp profile with one documented namespace-local correction supports the sandbox; see [source notice](../containers/NOTICE.md).

The internal network has no external gateway. Browser control uses a host loopback proxy that forwards at most four TCP streams through `docker compose exec` stdin/stdout to the fixed browser control socket. It neither accepts destinations nor provides a general network tunnel. No browser network port is published. The ephemeral Playwright endpoint is kept in memory and omitted from evidence. This arrangement avoids granting the worker an external interface just to reach its controller.

The verifier checks actual UID, seccomp mode, effective capabilities, read-only configuration and absence of bind mounts and provider credentials. It starts a request receiver on a separate external network and first confirms that receiver works. Direct Node requests from each worker and a raw browser navigation, with application interception bypassed, must fail while the receiver count stays unchanged. Finally, an approved capability must return the expected synthetic member's typed balance through real UI replay.

The first successful development check was `cb9d3073-40d1-457c-8f08-942fbbf18e35`, against a working tree based on `c97f368`. Final evidence must be regenerated from committed source. Local verification used Docker 29.4.0, a Linux ARM64 VM, Node 24.21.0 in the worker and Chromium 153.0.8010.12. The host controller used Node 24.15.0. Linux CI verifies its own architecture separately.

Containers share a kernel with their Docker host. This profile does not establish resistance to kernel exploits, protect against a malicious host administrator, provide enterprise identity or isolate millions of tenants. Production requires separately protected worker infrastructure, tenant-scoped credentials and storage, workload admission and operational patching. A failed sandbox launch is an unsupported host configuration, not permission to disable the sandbox. See [capacity and deployment design](scale.md) for the larger system.
