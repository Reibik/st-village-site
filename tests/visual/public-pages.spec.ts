import { expect, test, type Page } from "@playwright/test";

async function prepare(page: Page) {
  await page.addInitScript(() => localStorage.setItem("st-theme", "dark"));
  await page.route("**/api/pricing", (route) => route.abort());
  await page.route("**/api/news?**", (route) => route.abort());
  await page.route("**/api/version", (route) => route.fulfill({
    json: { version: "1.0.0", channel: "stable" },
  }));
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.addStyleTag({
    content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
  });
}

test("главная страница", async ({ page }) => {
  await prepare(page);
  await page.goto("/", { waitUntil: "networkidle" });

  const hero = page.locator(".hero");
  const quickAccess = page.locator(".cta-panel");
  await expect(hero).toBeVisible();
  await expect(quickAccess).toBeVisible();
  await settle(page);

  await expect(hero).toHaveScreenshot("home-hero.png");
  await expect(quickAccess).toHaveScreenshot("home-quick-access.png");
});

test("страница тарифов", async ({ page }) => {
  await prepare(page);
  await page.goto("/pricing", { waitUntil: "networkidle" });

  const pricingPage = page.locator(".pricing-page-content");
  await expect(pricingPage).toBeVisible();
  await expect(page.locator(".tariff-card")).toHaveCount(5);
  await settle(page);

  await expect(pricingPage).toHaveScreenshot("pricing-page.png");
});
