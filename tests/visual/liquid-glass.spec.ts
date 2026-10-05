import { expect, test, type Page } from "@playwright/test";

async function prepare(page: Page) {
  await page.addInitScript(() => localStorage.setItem("st-theme", "dark"));
  await page.route("https://code.jivo.ru/**", (route) => route.abort());
  await page.route("**/api/news?**", (route) => route.fulfill({ json: { posts: [], hasMore: false, nextBefore: null } }));
  await page.route("**/api/live-status", (route) => route.fulfill({ status: 503, json: {} }));
  await page.route("**/api/pricing", (route) => route.fulfill({ json: {
    status: "ok", stale: false, updatedAt: "2026-10-05T09:00:00Z", tariffs: [{
      id: 1, name: "Личный", description: "Для ваших устройств", trafficLimitGb: 100, deviceLimit: 3,
      periods: [
        { days: 30, label: "1 месяц", priceKopeks: 15000, originalPriceKopeks: null, discountPercent: null },
        { days: 90, label: "3 месяца", priceKopeks: 40000, originalPriceKopeks: null, discountPercent: null },
      ],
    }],
  } }));
  await page.route("**/api/version**", (route) => route.fulfill({ json: { version: "1.3.0", updateAvailable: false } }));
}

test("стеклянные поверхности не размывают текст и не перехватывают кнопки в обеих темах", async ({ page }) => {
  await prepare(page);
  await page.goto("/");
  const card = page.locator(".tariff-card").first();
  await expect(card).toBeVisible();
  for (const theme of ["dark", "light"]) {
    await page.evaluate((value) => document.documentElement.dataset.theme = value, theme);
    for (const selector of [".site-header", ".tariff-card", ".cabinet-preview-frame"]) {
      expect(await page.locator(selector).first().evaluate((element) => getComputedStyle(element).backdropFilter)).toMatch(/blur\(/);
    }
    expect(await card.locator("h3").evaluate((element) => getComputedStyle(element).filter)).toBe("none");
    expect(await page.locator(".hero-emblem-picture img").evaluate((element) => getComputedStyle(element).filter)).not.toMatch(/blur\(/);
    await card.getByRole("button", { name: "3 месяца" }).click();
    await expect(card.locator(".tariff-price")).toContainText("400");
    await card.getByRole("button", { name: "1 месяц" }).click();
    await expect(card.locator(".tariff-price")).toContainText("150");
    await expect(page.locator(".hero-actions .button-primary")).toHaveAttribute("href", "https://cabinet.stvillage.top");
    expect(await page.locator(".hero-actions .button-primary").evaluate((element) => parseFloat(getComputedStyle(element).borderTopLeftRadius))).toBeGreaterThanOrEqual(20);
    if (test.info().project.name === "mobile") {
      expect(await page.locator(".hero-actions .button-secondary").evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(42);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (theme === "light") {
      for (const selector of [".cabinet-preview-footer strong", ".cabinet-preview-chip-secure", ".cabinet-preview-toolbar strong", ".cabinet-preview-toolbar > span:nth-child(2)"]) {
        const contrast = await page.locator(selector).evaluate((element) => {
          const text = getComputedStyle(element).color.match(/[\d.]+/g)!.map(Number);
          const surface = getComputedStyle(document.documentElement).getPropertyValue("--liquid-glass-surface").match(/[\d.]+/g)!.map(Number);
          // The least bright backdrop is black; reflection gradients only lighten it.
          const background = surface.slice(0, 3).map((value) => value * (surface[3] ?? 1));
          const luminance = (rgb: number[]) => rgb.slice(0, 3).reduce((sum, value, index) => {
            const channel = value / 255;
            return sum + (channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4) * [.2126, .7152, .0722][index];
          }, 0);
          return (luminance(background) + .05) / (luminance(text) + .05);
        });
        expect(contrast, selector).toBeGreaterThanOrEqual(4.5);
      }
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: `test-results/liquid-glass-${test.info().project.name}-${theme}.png` });
  }
});

test("в режиме высокой контрастности стекло заменяется системными цветами", async ({ page }) => {
  await prepare(page);
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/");
  const card = page.locator(".tariff-card").first();
  await expect(card).toBeVisible();
  for (const selector of [".site-header", ".tariff-card", ".cabinet-preview-frame"]) {
    expect(await page.locator(selector).first().evaluate((element) => getComputedStyle(element).backdropFilter)).toBe("none");
  }
  expect(await page.locator(".hero-actions .button-primary").evaluate((element) => getComputedStyle(element, "::before").display)).toBe("none");
  await card.getByRole("button", { name: "3 месяца" }).click();
  await expect(card.locator(".tariff-price")).toContainText("400");
});

test("уменьшенная прозрачность и движение отключают эффекты, но сохраняют управление", async ({ page }) => {
  await prepare(page);
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setEmulatedMedia", { features: [
    { name: "prefers-reduced-transparency", value: "reduce" },
    { name: "prefers-reduced-motion", value: "reduce" },
  ] });
  await page.goto("/");
  await expect(page.locator(".tariff-card")).toBeVisible();
  for (const selector of [".site-header", ".tariff-card", ".cabinet-preview-frame"]) {
    expect(await page.locator(selector).first().evaluate((element) => getComputedStyle(element).backdropFilter)).toBe("none");
  }
  const button = page.locator(".hero-actions .button-primary");
  await button.hover();
  expect(await button.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
  await page.getByRole("button", { name: "Переключить цветовую тему" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("без улучшения backdrop-filter поверхность остаётся непрозрачной и читаемой", async ({ page }) => {
  await prepare(page);
  await page.goto("/");
  await expect(page.locator(".tariff-card")).toBeVisible();
  const removed = await page.evaluate(() => {
    let removed = 0;
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
          const rule = sheet.cssRules[i];
          if (rule instanceof CSSSupportsRule && rule.conditionText.includes("backdrop-filter") && rule.cssText.includes("--liquid-glass")) {
            sheet.deleteRule(i);
            removed++;
          }
        }
      } catch { /* Cross-origin third-party styles are not part of this test. */ }
    }
    return removed;
  });
  expect(removed).toBeGreaterThan(0);
  const card = page.locator(".tariff-card").first();
  expect(await card.evaluate((element) => getComputedStyle(element).backdropFilter)).toBe("none");
  expect(await card.evaluate((element) => getComputedStyle(element).backgroundColor)).toMatch(/^rgb\([^/]+\)$/);
  await card.getByRole("button", { name: "3 месяца" }).click();
  await expect(card.locator(".tariff-price")).toContainText("400");
});
