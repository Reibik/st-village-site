import { expect, test } from "@playwright/test";
import { prepareHoliday } from "./holiday-fixture";

test("holiday preference is keyboard accessible, persists and leaves the colour theme alone", async ({ page }) => {
  await prepareHoliday(page);
  await page.goto("/");
  const logo = page.locator('[data-holiday-surface="logo"]');
  await expect(logo).toHaveAttribute("data-holiday-theme", "halloween");
  const button = page.getByRole("button", { name: "Праздничное оформление: включено" });
  await button.focus(); await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Праздничное оформление: выключено" })).toHaveAttribute("aria-pressed", "false");
  await expect(logo).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("st-holiday-effects"))).toBe("off");
  await page.reload(); await expect(logo).toHaveCount(0);
  await page.getByRole("button", { name: "Праздничное оформление: выключено" }).focus();
  await page.keyboard.press("Enter"); await expect(logo).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem("st-theme"))).toBeNull();
});

test("calendar refreshes across Moscow midnight and clears the ended holiday", async ({ page }) => {
  await prepareHoliday(page, "2026-10-24T20:59:30Z"); await page.goto("/");
  await expect(page.getByRole("button", { name: /Праздничное оформление/ })).toBeEnabled();
  await expect(page.locator('[data-holiday-surface="logo"]')).toHaveCount(0);
  await page.clock.fastForward(60_000);
  await expect(page.locator('[data-holiday-surface="logo"]')).toHaveCount(1);
  await page.clock.setSystemTime(new Date("2026-11-01T21:00:00Z")); await page.clock.fastForward(60_000);
  await expect(page.locator('[data-holiday-surface="logo"]')).toHaveCount(0);
});

test("blocked storage does not prevent toggling or break the page", async ({ page }) => {
  await prepareHoliday(page);
  await page.addInitScript(() => Object.defineProperty(window, "localStorage", { get() { throw new DOMException("denied", "SecurityError"); } }));
  await page.goto("/");
  await page.getByRole("button", { name: "Праздничное оформление: включено" }).click();
  await expect(page.locator('[data-holiday-surface]')).toHaveCount(0);
  await page.getByRole("button", { name: "Праздничное оформление: выключено" }).click();
  await expect(page.locator('[data-holiday-surface="logo"]')).toHaveCount(1);
  await expect(page.locator("h1")).toBeVisible();
});

test("preference changes and storage clearing sync across tabs", async ({ page, context }) => {
  await prepareHoliday(page); await page.goto("/");
  const other = await context.newPage(); await prepareHoliday(other); await other.goto("/");
  await page.getByRole("button", { name: "Праздничное оформление: включено" }).click();
  await expect(other.getByRole("button", { name: "Праздничное оформление: выключено" })).toHaveAttribute("aria-pressed", "false");
  await page.evaluate(() => localStorage.removeItem("st-holiday-effects"));
  await expect(other.getByRole("button", { name: "Праздничное оформление: включено" })).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => localStorage.setItem("st-holiday-effects", "off"));
  await expect(other.locator('[data-holiday-surface="logo"]')).toHaveCount(0);
  await page.evaluate(() => localStorage.clear());
  await expect(other.locator('[data-holiday-surface="logo"]')).toHaveCount(1);
  await other.close();
});

test("hidden tab pauses its calendar and refreshes immediately when visible", async ({ page }) => {
  await prepareHoliday(page); await page.goto("/");
  await expect(page.locator('[data-holiday-surface="logo"]')).toHaveCount(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator('[data-holiday-surface="logo"]')).toHaveAttribute("data-paused", "true");
  await page.clock.setSystemTime(new Date("2026-11-02T12:00:00Z"));
  await page.clock.fastForward(120_000);
  await expect(page.locator('[data-holiday-surface="logo"]')).toHaveCount(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator('[data-holiday-surface="logo"]')).toHaveCount(0);
});

test("stored off never flashes a decoration and normal hydration has no errors", async ({ page }) => {
  await prepareHoliday(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (/hydration|didn't match/i.test(message.text())) errors.push(message.text()); });
  await page.addInitScript(() => {
    localStorage.setItem("st-holiday-effects", "off");
    (window as unknown as { holidaySeen: boolean }).holidaySeen = false;
    new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node instanceof Element && (node.matches("[data-holiday-surface]") || node.querySelector("[data-holiday-surface]"))) (window as unknown as { holidaySeen: boolean }).holidaySeen = true;
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Праздничное оформление: выключено" })).toBeEnabled();
  expect(await page.evaluate(() => (window as unknown as { holidaySeen: boolean }).holidaySeen)).toBe(false);
  expect(errors).toEqual([]);
});

test("renderer failure is contained while the page remains usable", async ({ page }) => {
  await prepareHoliday(page);
  await page.route("**/src/features/holidays/holiday-scene.tsx*", async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    await route.fulfill({ response, body: source.replace(/function HolidayScene\([^]*?\) \{/, '$& throw new Error("test-render-failure");') });
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Праздничное оформление: включено" })).toBeEnabled();
  await expect(page.locator('[data-holiday-surface]')).toHaveCount(0);
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(".hero-actions .button-primary")).toHaveAttribute("href", "https://cabinet.stvillage.top");
});

test("client navigation preserves global effects without duplicating the shared logo", async ({ page }) => {
  await prepareHoliday(page); await page.goto("/");
  await expect(page.locator('[data-holiday-surface="hero"]')).toHaveCount(1);
  await page.locator('.site-footer a[href="/status"]').click();
  await expect(page).toHaveURL("/status");
  await expect(page.locator('[data-holiday-surface="hero"]')).toHaveCount(0);
  await expect(page.locator('[data-holiday-surface="edges"]')).toHaveCount(1);
  await expect(page.locator('[data-holiday-surface="logo"]')).toHaveCount(1);
  await page.getByRole("link", { name: "ST VILLAGE — главная", exact: true }).click();
  await expect(page.locator('[data-holiday-surface="hero"]')).toHaveCount(1);
  await expect(page.locator('[data-holiday-surface="logo"]')).toHaveCount(1);
});
