// Run against a local production preview. Requires Playwright from your browser tooling.
// Example: CHROMIUM_PATH=/usr/bin/chromium node scripts/browser-qa.mjs
// PLAYWRIGHT_MODULE can point to a tool-managed Playwright module; no package changes required.
// QA_BASE_URL and QA_OUTPUT override the preview address and temporary artifact directory.
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? "playwright"
);
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join as joinPath } from "node:path";
const output =
  process.env.QA_OUTPUT ?? joinPath(tmpdir(), "wiresharks-browser-qa");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
  headless: true,
});
const base = process.env.QA_BASE_URL ?? "http://127.0.0.1:4319";
const checks = [];
const pass = (name) => {
  checks.push(name);
  console.log("PASS", name);
};
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
page.setDefaultTimeout(5000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(base);
await page.keyboard.press("Tab");
assert.equal(await page.locator(":focus").textContent(), "Skip to content");
await page.keyboard.press("Enter");
assert.equal(await page.locator(":focus").getAttribute("id"), "main");
pass("skip link moves focus to main");
await page.getByRole("button", { name: "Open menu" }).click();
await page.keyboard.press("Tab");
assert.equal(await page.locator(":focus").getAttribute("href"), "/raptor");
await page.keyboard.press("Shift+Tab");
assert.equal(
  await page.locator(":focus").getAttribute("aria-label"),
  "Close menu",
);
await page.keyboard.press("Shift+Tab");
assert.equal(
  await page.locator(":focus").getAttribute("href"),
  "mailto:hello@wiresharks.tech",
);
await page.keyboard.press("Tab");
assert.equal(
  await page.locator(":focus").getAttribute("aria-label"),
  "Close menu",
);
await page.keyboard.press("Escape");
assert.equal(
  await page.locator(":focus").getAttribute("aria-label"),
  "Open menu",
);
pass("mobile menu wraps Tab/Shift+Tab and Escape restores focus");
await page.getByRole("button", { name: "Open menu" }).click();
await page.keyboard.press("Tab");
await page.keyboard.press("Enter");
await page.waitForURL("**/raptor");
await page.waitForTimeout(60);
assert.equal(await page.locator(":focus").getAttribute("id"), "main");
assert.equal(
  await page
    .getByRole("button", { name: "Open menu" })
    .getAttribute("aria-expanded"),
  "false",
);
await page.goBack();
await page.waitForTimeout(60);
assert.equal(await page.locator(":focus").getAttribute("id"), "main");
pass("route selection and browser Back focus the new main content");
await page.getByRole("button", { name: "Open menu" }).click();
await page.mouse.click(380, 800);
assert.equal(
  await page
    .getByRole("button", { name: "Open menu" })
    .getAttribute("aria-expanded"),
  "false",
);
pass("outside pointer closes menu");
await page.setViewportSize({ width: 1024, height: 900 });
await page.locator("#navigation a").first().focus();
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(60);
assert.equal(
  await page.locator(":focus").getAttribute("aria-label"),
  "Open menu",
);
pass("responsive navigation keeps focus visible when desktop links hide");
await page.goto(base + "/#%E0%A4%A");
await page.waitForTimeout(60);
assert.equal(errors.length, 0);
pass("malformed hash does not throw");
await page.goto(base + "/#faq");
await page.locator("summary").first().focus();
await page.keyboard.press("Enter");
assert.equal(await page.locator("details").first().getAttribute("open"), "");
await page.keyboard.press("Enter");
assert.equal(await page.locator("details").first().getAttribute("open"), null);
pass("FAQ works from the keyboard");
for (const width of [320, 390, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  for (const path of ["/", "/raptor", "/talon", "/console", "/missing"]) {
    await page.goto(base + path);
    await page.evaluate(() => document.fonts.ready);
    const dims = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      window: innerWidth,
    }));
    assert.ok(dims.doc <= dims.window, `${path} at ${width} overflows`);
    if (path === "/raptor") {
      const lockup = await page
        .locator(".page-lockup")
        .evaluate((el) => ({
          display: getComputedStyle(el).display,
          gap: getComputedStyle(el).gap,
          flow: getComputedStyle(el).gridAutoFlow,
          rects: [...el.children].map((c) =>
            c.getBoundingClientRect().toJSON(),
          ),
        }));
      assert.equal(lockup.display, "grid");
      if (width >= 1024)
        assert.ok(
          Math.abs(
            lockup.rects[0].x +
              lockup.rects[0].width / 2 -
              (lockup.rects[1].x + lockup.rects[1].width / 2),
          ) < 1,
        );
      else {
        assert.equal(lockup.gap, "14px");
        assert.equal(lockup.flow, "column");
      }
    }
    if (path === "/console") {
      const rects = await page
        .locator(".waitlist-row")
        .evaluate((el) => ({
          row: el.getBoundingClientRect().toJSON(),
          children: [...el.children].map((c) =>
            c.getBoundingClientRect().toJSON(),
          ),
        }));
      assert.ok(
        rects.children.every(
          (r) => r.x >= rects.row.x && r.right <= rects.row.right + 1,
        ),
      );
      const sizes = await page
        .locator(".live-console-stage")
        .evaluate((el) => ({
          parent: el.getBoundingClientRect().height,
          child: el.firstElementChild.getBoundingClientRect().height,
        }));
      assert.equal(sizes.child, sizes.parent);
    }
  }
}
pass(
  "25 route/viewport combinations: no document overflow, responsive lockup, contained waitlist and full-height stage",
);
await page.setViewportSize({ width: 720, height: 450 });
for (const path of ["/", "/raptor", "/talon", "/console"]) {
  await page.goto(base + path);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
}
pass(
  "200% equivalent reflow at 720x450 CSS pixels for a 1440x900 desktop window",
);
// The console test uses deterministic local responses; it never submits an address externally.
await page.setViewportSize({ width: 320, height: 900 });
await page.route("http://localhost:8787/waitlist", (route) =>
  route.fulfill({
    status: 201,
    json: { status: "added" },
    headers: { "Access-Control-Allow-Origin": "*" },
  }),
);
await page.goto(base + "/console");
const email = page.getByRole("textbox", { name: "Join the waitlist" });
const join = page.getByRole("button", { name: "Join", exact: true });
await email.fill("qa@example.test");
await join.click();
await page.getByText("You're on the list.", { exact: true }).waitFor();
pass("waitlist confirms 201 response");
await page.unroute("http://localhost:8787/waitlist");
await page.route("http://localhost:8787/waitlist", (route) =>
  route.fulfill({
    status: 200,
    json: { status: "duplicate" },
    headers: { "Access-Control-Allow-Origin": "*" },
  }),
);
await join.click();
await page.getByText("You're already on the list.", { exact: true }).waitFor();
pass("waitlist confirms duplicate response");
await page.unroute("http://localhost:8787/waitlist");
await page.route("http://localhost:8787/waitlist", (route) =>
  route.fulfill({
    status: 503,
    json: { error: "unavailable" },
    headers: { "Access-Control-Allow-Origin": "*" },
  }),
);
await join.click();
await page
  .getByText("Could not confirm your sign-up. Please try again.", {
    exact: true,
  })
  .waitFor();
assert.equal(await email.inputValue(), "qa@example.test");
pass("waitlist failure preserves email for retry");
await page.unroute("http://localhost:8787/waitlist");
let posts = 0;
await page.route("http://localhost:8787/waitlist", (route) => {
  posts++;
  return new Promise(() => {});
});
await page.clock.install();
await join.click();
await page.getByRole("button", { name: "Sending…" }).waitFor();
await page.keyboard.press("Enter");
assert.equal(posts, 1);
assert.equal(await page.locator(":focus").textContent(), "Sending…→");
await page.clock.fastForward(15_001);
await page
  .getByText("Could not confirm your sign-up. Please try again.", {
    exact: true,
  })
  .waitFor();
assert.equal(await email.getAttribute("readonly"), null);
pass(
  "pending sign-up keeps focus, prevents duplicates, times out and allows retry",
);
await page.clock.resume();
const started = page.waitForRequest((r) => r.url().endsWith("/waitlist"));
await join.click();
await started;
const canceled = page.waitForEvent("requestfailed", {
  predicate: (r) => r.url().endsWith("/waitlist"),
});
await page
  .locator(".masthead")
  .getByRole("link", { name: "Wiresharks home", exact: true })
  .click();
assert.match((await canceled).failure().errorText, /ABORTED/);
assert.equal(errors.length, 0);
pass("leaving the console cancels its pending sign-up without page errors");
await context.close();
// WebGL failure should keep a centered static view and usable form.
const fallback = await browser.newContext({
  viewport: { width: 320, height: 900 },
  reducedMotion: "reduce",
});
await fallback.addInitScript(() => {
  const native = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
    return kind.startsWith("webgl") ? null : native.call(this, kind, ...args);
  };
});
await fallback.addInitScript(() => {
  class LocalEventSource extends EventTarget {
    constructor() {
      super();
      globalThis.qaEvents = this;
    }
    close() {}
  }
  globalThis.EventSource = LocalEventSource;
});
const fp = await fallback.newPage();
await fp.goto(base + "/console");
await fp.locator(".is-fallback .rpe-static").waitFor();
const fit = await fp
  .locator(".live-console-stage")
  .evaluate((el) => ({
    parent: el.getBoundingClientRect().toJSON(),
    orb: el.querySelector("svg").getBoundingClientRect().toJSON(),
  }));
assert.ok(
  Math.abs(
    fit.parent.x + fit.parent.width / 2 - (fit.orb.x + fit.orb.width / 2),
  ) < 1,
);
assert.ok(fit.orb.width <= fit.parent.width);
await fp
  .getByText("Connecting to the session server…", { exact: true })
  .waitFor();
await fp.evaluate(() => globalThis.qaEvents.dispatchEvent(new Event("open")));
await fp
  .getByText("Connected to the session server.", { exact: true })
  .waitFor();
await fp.evaluate(() => globalThis.qaEvents.dispatchEvent(new Event("error")));
await fp
  .getByText("Session connection interrupted. Retrying…", { exact: true })
  .waitFor();
await fp.evaluate(() => globalThis.qaEvents.dispatchEvent(new Event("open")));
await fp
  .getByText("Connected to the session server.", { exact: true })
  .waitFor();
pass("session connection state reflects interruption and native recovery");
await fp.getByRole("textbox").fill("qa@example.test");
await fp.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await fp.screenshot({
  path: joinPath(output, "console-fallback-320.png"),
  fullPage: true,
});
pass("WebGL fallback stays centered and leaves the waitlist usable");
await fallback.close();
await browser.close();
await writeFile(
  joinPath(output, "checks.json"),
  JSON.stringify({ checks, errors }, null, 2),
);
console.log(`${checks.length} browser groups passed`);
