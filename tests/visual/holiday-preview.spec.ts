import { expect, test } from "@playwright/test";
import { prepareHoliday } from "./holiday-fixture";

test("dev preview switches an isolated sample without changing the saved choice", async ({ page }) => {
  await prepareHoliday(page);
  await page.addInitScript(() => localStorage.setItem("st-holiday-effects", "off"));
  await page.goto("/preview/holidays");
  const sample = page.locator("[data-holiday-preview]");
  await expect(sample).toBeVisible();
  for (const [label, theme] of [["Зима", "winter"], ["Космос", "space"], ["Хэллоуин", "halloween"]]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(sample.locator('[data-holiday-surface="hero"]')).toHaveAttribute("data-holiday-theme", theme);
    await expect(page.getByRole("button", { name: label, exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => localStorage.getItem("st-holiday-effects"))).toBe("off");
  }
  await page.getByRole("button", { name: "Обычный вид", exact: true }).click();
  await expect(page.locator("[data-holiday-surface]")).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const response = await page.request.get("/sitemap.xml");
  expect(await response.text()).not.toContain("/preview/holidays");
});

test("preview honours reduced motion and forced colours", async ({ page }) => {
  await prepareHoliday(page); await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/preview/holidays");
  await page.getByRole("button", { name: "Зима", exact: true }).click();
  expect(await page.locator("[data-holiday-particle]").evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).animationName === "none"))).toBe(true);
  await page.emulateMedia({ forcedColors: "active" });
  await expect(page.locator("[data-holiday-surface]:visible")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Зима", exact: true })).toBeVisible();
});

test("preview pauses decoration when the tab is hidden and resumes on return", async ({ page }) => {
  await prepareHoliday(page); await page.goto("/preview/holidays");
  await page.getByRole("button", { name: "Зима", exact: true }).click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const scene = page.locator('[data-holiday-preview] [data-holiday-surface="hero"]');
  await expect(scene).toHaveAttribute("data-paused", "true");
  expect(await scene.locator("[data-holiday-particle]").first().evaluate((node) => getComputedStyle(node).animationPlayState)).toBe("paused");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(scene).toHaveAttribute("data-paused", "false");
});
