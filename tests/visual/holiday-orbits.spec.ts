import { expect, test } from "@playwright/test";
import { prepareHoliday } from "./holiday-fixture";

for (const [theme, date] of [["winter", "2026-12-25T12:00:00Z"], ["space", "2026-04-12T12:00:00Z"], ["halloween", "2026-10-25T12:00:00Z"]]) {
  test(`${theme} scene is bounded, accessible and has dark/light visual baselines`, async ({ page }) => {
    await prepareHoliday(page, date);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator('[data-holiday-surface="hero"]')).toHaveAttribute("data-holiday-theme", theme);
    for (const scheme of ["dark", "light"]) {
      await page.evaluate((value) => document.documentElement.dataset.theme = value, scheme);
      await expect(page.locator(".hero")).toHaveScreenshot(`holiday-${theme}-${scheme}.png`);
    }
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const particles = page.locator("[data-holiday-particle]:visible");
      expect(await particles.count()).toBeLessThanOrEqual(width <= 680 ? 6 : 18);
      expect(await particles.count()).toBeGreaterThan(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const element of await particles.all()) {
        expect(await element.evaluate((node) => {
          const box = node.getBoundingClientRect();
          const surface = node.closest('[data-holiday-surface]')!.getBoundingClientRect();
          return box.left >= surface.left - 1 && box.right <= surface.right + 1 && box.top >= surface.top - 1 && box.bottom <= surface.bottom + 1;
        })).toBe(true);
      }
    }
    for (const surface of await page.locator('[data-holiday-surface]').all()) await expect(surface).toHaveAttribute("aria-hidden", "true");
    expect(await particlesHaveAnimations(page)).toBe(false);
    await page.emulateMedia({ forcedColors: "active" });
    await expect(page.locator('[data-holiday-surface]:visible')).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Праздничное оформление/ })).toBeVisible();
  });
}

async function particlesHaveAnimations(page: import("@playwright/test").Page) {
  return page.locator("[data-holiday-particle]:visible").evaluateAll((nodes) => nodes.some((node) => getComputedStyle(node).animationName !== "none"));
}

test("routes keep public holiday edges and ignore forced theme parameters", async ({ page }) => {
  await prepareHoliday(page);
  for (const path of ["/news", "/pricing", "/status"]) {
    await page.goto(path);
    await expect(page.locator('[data-holiday-surface="logo"]')).toHaveCount(1);
    await expect(page.locator('[data-holiday-surface="hero"]')).toHaveCount(0);
    await expect(page.locator('[data-holiday-surface="edges"]')).toBeVisible();
  }
  await page.goto("/status/management"); await expect(page.locator('[data-holiday-surface]')).toHaveCount(0);
  await page.goto("/?theme=winter");
  await expect(page.locator('[data-holiday-surface="hero"]')).toHaveAttribute("data-holiday-theme", "halloween");
  await page.getByRole("button", { name: "Праздничное оформление: включено" }).click();
  await expect(page.locator('[data-holiday-surface]')).toHaveCount(0);
});

test("holiday controls fit a narrow screen with larger text and motion changes live", async ({ page }) => {
  await prepareHoliday(page); await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/");
  await expect(page.locator('[data-holiday-surface="hero"]')).toBeVisible();
  await page.addStyleTag({ content: "body { font-size: 200%; } .holiday-toggle { font-size: 20px; }" });
  const toggle = page.getByRole("button", { name: /Праздничное оформление/ });
  await toggle.scrollIntoViewIfNeeded();
  const box = await toggle.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" }); expect(await particlesHaveAnimations(page)).toBe(false);
  await page.emulateMedia({ reducedMotion: "no-preference" }); expect(await particlesHaveAnimations(page)).toBe(true);
  await toggle.click(); await expect(page.locator('[data-holiday-surface]')).toHaveCount(0);
});

test("no JavaScript leaves the original content and cabinet link usable without decoration", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage(); await page.goto("http://127.0.0.1:4173/");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".hero-actions .button-primary")).toHaveAttribute("href", "https://cabinet.stvillage.top");
    await expect(page.locator('[data-holiday-surface]')).toHaveCount(0);
  } finally { await context.close(); }
});

test("edge decorations stay outside the content gutters at tablet and desktop widths", async ({ page }) => {
  await prepareHoliday(page); await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator('[data-holiday-surface="hero"]')).toBeVisible();
  for (const width of [680, 681, 760, 800, 980, 1024, 1180, 1220, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => window.scrollTo(0, 600));
    const content = (await page.locator(".hero").boundingBox())!;
    await expect(page.locator('[data-holiday-surface="edges"]')).toBeVisible();
    expect(await page.locator('[data-holiday-surface="edges"] [data-holiday-particle]:visible').count()).toBeGreaterThan(0);
    for (const particle of await page.locator('[data-holiday-surface="edges"] [data-holiday-particle]:visible').all()) {
      const box = (await particle.boundingBox())!;
      expect(box.x + box.width <= content.x || box.x >= content.x + content.width, `particle overlaps content at ${width}px: ${JSON.stringify(box)}`).toBe(true);
    }
  }
});

for (const [theme, date] of [["winter", "2026-12-25T12:00:00Z"], ["space", "2026-04-12T12:00:00Z"], ["halloween", "2026-10-26T12:00:00Z"]]) {
  test(`${theme} works on every public page and can be switched off there`, async ({ page }) => {
    await prepareHoliday(page, date);
    // /login redirects to the separate cabinet; it has no landing-page UI to decorate.
    for (const path of ["/", "/pricing", "/connect", "/news", "/status", "/support", "/legal/privacy", "/legal/terms", "/release", "/coupons"]) {
      await page.goto(path);
      await expect(page.locator('[data-holiday-surface="logo"]')).toHaveAttribute("data-holiday-theme", theme);
      const edges = page.locator('[data-holiday-surface="edges"]');
      await expect(edges).toBeVisible();
      await expect(edges).toHaveAttribute("aria-hidden", "true");
      expect(await edges.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("none");
      await expect(page.locator("h1")).toBeVisible();
    }
    await page.getByRole("button", { name: "Праздничное оформление: включено" }).click();
    await expect(page.locator('[data-holiday-surface]')).toHaveCount(0);
    await page.goto("/news");
    await expect(page.getByRole("button", { name: "Праздничное оформление: выключено" })).toBeEnabled();
    await expect(page.locator('[data-holiday-surface]')).toHaveCount(0);
  });
}
