import { createHash } from "node:crypto";
import {
  type Browser,
  type BrowserContext,
  chromium,
  type Dialog,
  type Locator,
  type Page,
} from "playwright";
import type { Action, Arguments, Condition, Target } from "../contracts/capability.js";
import { RunError } from "../contracts/errors.js";
import type { Observation } from "../contracts/runtime.js";
import type { Policy } from "../core/policy.js";
import type { Surface } from "./surface.js";

export interface SurfaceMarkers {
  screens: string[];
  states: { target: string; state: Exclude<Observation["state"], { kind: "ready" }> }[];
}

export class BrowserSurface implements Surface {
  #generation = 0;
  #signature = "";
  #violation = false;
  #networkFailure = false;
  #closed = false;
  #dialog: Dialog | null = null;

  private constructor(
    readonly policy: Policy,
    private readonly inputs: Arguments,
    private readonly markers: SurfaceMarkers,
    private readonly browser: Browser,
    private readonly context: BrowserContext,
    private readonly page: Page,
    private readonly timeoutMs: number,
    private readonly imagePolicy: { mask: string; text: string[] } | undefined,
  ) {}

  static async create(
    policy: Policy,
    inputs: Arguments,
    markers: SurfaceMarkers,
    options: {
      timeoutMs?: number;
      endpoint?: string;
      imagePolicy?: { mask: string; text: string[] };
    } = {},
  ) {
    const env = Object.fromEntries(
      Object.entries(process.env).filter(
        ([key, value]) =>
          ["PATH", "HOME", "TMPDIR", "DISPLAY", "XDG_RUNTIME_DIR", "LANG"].includes(key) &&
          value !== undefined,
      ),
    ) as Record<string, string>;
    const browser = options.endpoint
      ? await chromium.connect(options.endpoint)
      : await chromium.launch({ headless: true, env });
    try {
      const context = await browser.newContext({
        viewport: { width: 1120, height: 760 },
        serviceWorkers: "block",
        acceptDownloads: false,
      });
      const page = await context.newPage();
      const surface = new BrowserSurface(
        policy,
        inputs,
        markers,
        browser,
        context,
        page,
        options.timeoutMs ?? 5_000,
        options.imagePolicy,
      );
      page.setDefaultTimeout(surface.timeoutMs);
      page.on("dialog", (dialog) => {
        surface.#dialog = dialog;
      });
      page.on("framenavigated", (frame) => {
        if (
          !policy.permitsRequest(frame.url(), "GET") &&
          !policy.permitsRequest(frame.url(), "POST")
        )
          surface.#violation = true;
      });
      page.on("filechooser", () => {
        surface.#violation = true;
      });
      page.on("pageerror", () => {
        surface.#networkFailure = true;
      });
      page.on("download", (download) => {
        surface.#violation = true;
        void download.cancel();
      });
      context.on("page", (popup) => {
        surface.#violation = true;
        void popup.close();
      });
      await context.routeWebSocket("**", (socket) => {
        surface.#violation = true;
        socket.close();
      });
      await context.route("**/*", async (route) => {
        try {
          const request = route.request();
          if (
            !policy.permitsRequest(request.url(), request.method()) ||
            (request.isNavigationRequest() && request.frame().page() !== page)
          ) {
            surface.#violation = true;
            await route.abort();
            return;
          }
          const response = await route.fetch({
            maxRedirects: 0,
            maxRetries: 0,
            timeout: surface.timeoutMs,
          });
          if (response.status() >= 300 && response.status() < 400) {
            surface.#violation = true;
            await route.abort();
            return;
          }
          if (response.status() >= 500) surface.#networkFailure = true;
          await route.fulfill({ response });
        } catch {
          if (!surface.#closed) surface.#networkFailure = true;
          await route.abort().catch(() => {});
        }
      });
      await page.goto(policy.origin, { waitUntil: "domcontentloaded", timeout: surface.timeoutMs });
      const frames = page.locator('iframe[name="workspace"]');
      try {
        await frames.waitFor({ state: "attached", timeout: surface.timeoutMs });
      } catch {
        throw new RunError("UNSUPPORTED_BINDING");
      }
      if ((await frames.count()) !== 1) throw new RunError("UNSUPPORTED_BINDING");
      return surface;
    } catch (error) {
      await browser.close();
      throw error instanceof RunError ? error : new RunError("APP_UNAVAILABLE");
    }
  }

  get browserVersion() {
    return this.browser.version();
  }
  get generation() {
    return this.#generation;
  }
  get hasDialog() {
    return this.#dialog !== null;
  }

  #locator(target: Target): Locator {
    const frame = this.page.frameLocator(`iframe[name="${target.frame}"]`);
    switch (target.kind) {
      case "role":
        return frame.getByRole(target.role, { name: target.name, exact: true });
      case "text":
        return frame.getByText(target.text, { exact: true });
      case "field":
        return frame
          .getByText(target.caption, { exact: true })
          .locator("..")
          .locator(target.control);
      case "cell":
        return frame
          .getByText(target.caption, { exact: true })
          .locator("..")
          .locator("td + td:not(:has(input, select))");
    }
  }

  #target(id: string): Locator {
    const target = this.policy.binding.targets[id];
    if (!target) throw new RunError("POLICY_DENIED");
    return this.#locator(target);
  }

  async #unique(id: string): Promise<Locator> {
    const locator = this.#target(id);
    const count = await locator.count();
    if (count > 1) throw new RunError("TARGET_AMBIGUOUS");
    if (count === 0 || !(await locator.isVisible())) throw new RunError("TARGET_MISSING");
    return locator;
  }

  async check(condition: Condition): Promise<boolean> {
    const locator = this.#target(condition.target);
    const count = await locator.count();
    if (count > 1) throw new RunError("TARGET_AMBIGUOUS");
    const visible = count === 1 && (await locator.isVisible());
    if (condition.kind === "visible") return visible;
    if (condition.kind === "absent") return !visible;
    if (!visible) return false;
    const target = this.policy.binding.targets[condition.target]!;
    const actual =
      target.kind === "field" ? await locator.inputValue() : (await locator.innerText()).trim();
    return (
      actual ===
      (condition.kind === "equalsInput" ? String(this.inputs[condition.input]) : condition.value)
    );
  }

  async observe(conditions: Condition[] = []): Promise<Observation> {
    if (this.#closed || this.page.isClosed()) throw new RunError("SESSION_LOST");
    if (this.#violation) throw new RunError("POLICY_DENIED");
    if (this.#networkFailure) throw new RunError("APP_UNAVAILABLE");
    if (this.#dialog)
      return {
        generation: this.#generation,
        screen: null,
        controls: [],
        conditions: [],
        state: { kind: "blocked", code: "UNEXPECTED_DIALOG" },
      };
    const controls: Observation["controls"] = [];
    for (const [id, target] of Object.entries(this.policy.binding.targets)) {
      const locator = this.#locator(target);
      const count = await locator.count();
      const visible = count === 1 && (await locator.isVisible());
      controls.push({
        id,
        kind: target.kind,
        count,
        visible,
        enabled: visible && (await locator.isEnabled()),
      });
    }
    const present = new Set(
      controls.filter((control) => control.visible).map((control) => control.id),
    );
    const screens = this.markers.screens.filter((screen) => present.has(screen));
    if (screens.length > 1) throw new RunError("CHECKPOINT_FAILED");
    const states = this.markers.states.filter((marker) => present.has(marker.target));
    if (states.length > 1) throw new RunError("CHECKPOINT_FAILED");
    let state: Observation["state"] = states[0]?.state ?? { kind: "ready" };
    if (
      state.kind === "ready" &&
      (await this.page
        .frameLocator('iframe[name="workspace"]')
        .locator('[role="dialog"]')
        .count()) > 0
    )
      state = { kind: "blocked", code: "UNEXPECTED_DIALOG" };
    const evaluated = [];
    for (const condition of conditions)
      evaluated.push({ condition, satisfied: await this.check(condition) });
    const safe = { screen: screens[0] ?? null, controls, conditions: evaluated, state };
    const signature = createHash("sha256")
      .update(JSON.stringify({ screen: safe.screen, controls, state }))
      .digest("hex");
    if (signature !== this.#signature) {
      this.#generation++;
      this.#signature = signature;
    }
    return { generation: this.#generation, ...safe };
  }

  async act(
    action: Action,
    inputs: Arguments,
    owner: "automation" | "human",
  ): Promise<string | null> {
    this.policy.authorize(action, owner);
    if (this.#violation) throw new RunError("POLICY_DENIED");
    if (this.#dialog) throw new RunError("UNEXPECTED_DIALOG");
    const locator = await this.#unique(action.target);
    this.#generation++;
    try {
      switch (action.kind) {
        case "fill":
          await locator.fill(String(inputs[action.input]));
          break;
        case "select":
          await locator.selectOption(String(inputs[action.input]));
          break;
        case "click":
          if (this.policy.binding.actions[action.target]?.navigationFrame) {
            const navigation = this.page.waitForEvent("framenavigated", {
              predicate: (frame) =>
                frame.name() === this.policy.binding.actions[action.target]?.navigationFrame,
              timeout: this.timeoutMs,
            });
            const [frame] = await Promise.all([
              navigation,
              locator.click({ timeout: this.timeoutMs }),
            ]);
            await frame.waitForLoadState("domcontentloaded", { timeout: this.timeoutMs });
          } else {
            await locator.click({ timeout: this.timeoutMs });
          }
          break;
        case "read":
          return (await locator.innerText()).trim();
      }
    } catch {
      throw new RunError("UNCERTAIN_EFFECT");
    }
    return null;
  }

  async dismissDialog() {
    if (!this.#dialog) throw new RunError("CONTROL_CONFLICT");
    const dialog = this.#dialog;
    this.#dialog = null;
    await dialog.dismiss();
    this.#generation++;
  }

  async screenshot(): Promise<Buffer | null> {
    if (this.#dialog || this.#closed || !this.imagePolicy || this.page.frames().length !== 2)
      return null;
    const observation = await this.observe();
    if (
      !observation.screen ||
      (observation.state.kind === "blocked" &&
        observation.state.code === "UNEXPECTED_DIALOG" &&
        !observation.controls.some(
          (control) => control.id === "operator-notice" && control.visible,
        ))
    )
      return null;
    for (const frame of this.page.frames()) {
      const safe = await frame.locator("body").evaluate((body, policy) => {
        const allowed = new Set(policy.text);
        const elements = body.querySelectorAll("*");
        if (elements.length > 2_000) return false;
        for (const element of [body, ...elements]) {
          if (element.closest(policy.mask)) continue;
          const style = getComputedStyle(element);
          if (
            style.visibility === "hidden" ||
            style.display === "none" ||
            !element.getClientRects().length
          )
            continue;
          if (
            ["IMG", "CANVAS", "SVG", "VIDEO", "OBJECT", "EMBED"].includes(element.tagName) ||
            style.backgroundImage !== "none"
          )
            return false;
          for (const pseudo of ["::before", "::after"]) {
            const content = getComputedStyle(element, pseudo).content;
            if (!["none", "normal", '""'].includes(content)) return false;
          }
          for (const node of element.childNodes) {
            if (node.nodeType !== Node.TEXT_NODE) continue;
            const text = node.textContent?.trim().replace(/\s+/g, " ");
            if (text && !allowed.has(text)) return false;
          }
        }
        return true;
      }, this.imagePolicy);
      if (!safe) return null;
    }
    return this.page.screenshot({
      type: "png",
      animations: "disabled",
      // Screenshot styles can be blocked by the target CSP. Native masks must cover pixels.
      mask: [
        this.page
          .frameLocator('iframe[name="workspace"]')
          .locator("input, select, .details td + td, .data-table tbody td, .intro, .training"),
      ],
      maskColor: "#e0e5e4",
      timeout: this.timeoutMs,
    });
  }

  async close() {
    this.#closed = true;
    await this.context.close();
    await this.browser.close();
  }
}
