import { expect, test } from "@playwright/test";

test("купоны недоступны в меню и футере, прямой адрес показывает только Скоро", async ({ page, request }) => {
  await page.addInitScript(() => localStorage.setItem("st-theme", "dark"));
  await page.route("**/api/pricing", (route) => route.abort());
  await page.route("**/api/news?**", (route) => route.abort());
  await page.route("**/api/live-status", (route) => route.abort());
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator('a[href="/coupons"]')).toHaveCount(0);
  await expect(page.locator(".coupon-home-section")).toHaveCount(0);
  const mobile = test.info().project.name === "mobile";
  if (mobile) await page.getByRole("button", { name: "Открыть меню" }).click();
  const nav = page.getByRole("navigation", { name: mobile ? "Мобильная навигация" : "Основная навигация", exact: true });
  const disabled = nav.getByRole("link", { name: "Купоны — скоро", exact: true });
  await expect(disabled).toBeVisible();
  await expect(disabled).toHaveAttribute("aria-disabled", "true");
  await expect(disabled).not.toHaveAttribute("href", /./);
  // Intentionally attempt a physical click on an aria-disabled non-anchor;
  // bypass only Playwright's enabled check, not the page's navigation behavior.
  await disabled.click({ force: true });
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".site-footer").getByRole("link", { name: "Купоны — скоро", exact: true })).toHaveAttribute("aria-disabled", "true");
  if (mobile) {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Открыть меню" })).toBeFocused();
  }
  await page.goto("/coupons", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Купоны — скоро", exact: true })).toBeVisible();
  await expect(page.locator('a[href*="start=coupon_"]')).toHaveCount(0);
  await expect(page.locator(".coupon-countdown")).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `test-results/coupons-soon-${test.info().project.name}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const response = await request.get("/api/coupons/current");
  expect(response.status()).toBe(503);
  expect(await response.json()).toEqual({ status: "coming_soon", error: "coupons_unavailable" });
});
