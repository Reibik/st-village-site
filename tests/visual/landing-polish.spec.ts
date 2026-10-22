import { expect, test, type Page } from "@playwright/test";
import { prepareHoliday } from "./holiday-fixture";

async function prepare(page: Page) {
  await prepareHoliday(page, "2026-10-22T12:00:00Z");
  await page.addInitScript(() => localStorage.setItem("st-theme", "dark"));
}

// Regressions caught: undersized trial restrictions, clipped country labels,
// perpetual decorative motion, and loss of the primary keyboard action.
test("условия пробного доступа читаются без увеличения на узком экране и в обеих темах", async ({ page }) => {
  await prepare(page);
  await page.goto("/");
  for (const theme of ["dark", "light"]) {
    await page.evaluate((value) => document.documentElement.dataset.theme = value, theme);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const selector of [".hero-trial-limits span span", ".hero-trial-countries > span", ".hero-trial p", ".orbit-proof a", ".network-facts span"]) {
        for (const label of await page.locator(selector).all()) {
          if (!await label.isVisible()) continue;
          expect(await label.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)), `${selector} at ${width}px`).toBeGreaterThanOrEqual(12);
          const layout = await label.evaluate((element) => {
            const box = element.getBoundingClientRect();
            return { text: element.textContent, width: element.clientWidth, scrollWidth: element.scrollWidth,
              fits: box.left >= 0 && box.right <= innerWidth && element.scrollWidth <= element.clientWidth + 1 };
          });
          expect(layout.fits, `${selector} clipped at ${width}px: ${JSON.stringify(layout)}`).toBe(true);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test("обычное оформление не запускает бесконечные анимации плашек и бликов", async ({ page }) => {
  await prepare(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const movingSurfaces = await page.locator(".signal-card, .cabinet-preview-chip, .cabinet-preview-picture").evaluateAll((elements) =>
    elements.flatMap((element) => [null, "::before", "::after"].map((pseudo) => {
      const style = getComputedStyle(element, pseudo);
      return { surface: element.className, animation: style.animationName, repeats: style.animationIterationCount };
    })).filter((style) => style.animation !== "none" && style.repeats.includes("infinite")));
  expect(movingSurfaces).toEqual([]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator(".cabinet-preview").hover();
  expect(await page.locator(".cabinet-preview").evaluate((element) => getComputedStyle(element).transform)).toBe("none");
});

test("пробный доступ остаётся заметным и доступным с клавиатуры", async ({ page }) => {
  await prepare(page);
  await page.goto("/");
  const button = page.locator(".hero-actions .button-primary");
  await expect(button).toHaveAttribute("href", "https://cabinet.stvillage.top");
  await button.focus();
  await expect(button).toBeFocused();
  expect(await button.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
  expect(await button.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await expect(page.getByRole("complementary", { name: "Пробный период" })).toContainText("Белые списки не входят");
});

test("полировка главной сохраняет визуальные эталоны обеих тем", async ({ page }) => {
  await prepare(page);
  await page.route("**/api/live-status", (route) => route.fulfill({ json: {
    status: "operational", generatedAt: "2026-10-22T12:00:00Z", refreshAfterSeconds: 60,
    totals: { online: 3, total: 3, maintenance: 0, uptime30: 99.9, averageLatencyMs: 84 }, incidents: [],
    servers: [
      { id: "de-1", name: "Германия #1", countryCode: "DE", status: "operational", uptime30: 99.9, latencyMs: 80, members: 1, membersOnline: 1 },
      { id: "pl-1", name: "Польша #1", countryCode: "PL", status: "operational", uptime30: 99.9, latencyMs: 84, members: 1, membersOnline: 1 },
      { id: "se-1", name: "Швеция #1", countryCode: "SE", status: "operational", uptime30: 99.9, latencyMs: 88, members: 1, membersOnline: 1 },
    ],
  } }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".network-country")).toHaveCount(3);
  await page.evaluate(() => document.fonts.ready);
  for (const theme of ["dark", "light"]) {
    await page.evaluate((value) => document.documentElement.dataset.theme = value, theme);
    for (const [name, selector] of [["hero", ".hero"], ["features", "#features"], ["steps", "#getting-started"], ["network", "#locations"]]) {
      const section = page.locator(selector);
      await section.scrollIntoViewIfNeeded();
      // Lazy media must be decoded before accepting a visual baseline.
      await section.locator("img").evaluateAll((images) => Promise.all(images.map((image) => (image as HTMLImageElement).decode())));
      await expect(section).toHaveScreenshot(`landing-${name}-${theme}.png`);
    }
  }
});
