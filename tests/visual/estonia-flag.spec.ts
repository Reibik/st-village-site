import { expect, test } from "@playwright/test";
import { prepareHoliday } from "./holiday-fixture";

test("Эстония показывает настоящий флаг в статусе и сводке главной в обеих темах", async ({ page }) => {
  await prepareHoliday(page, "2026-10-18T12:00:00Z");
  await page.route("**/api/live-status", (route) => route.fulfill({ json: {
    status: "operational", generatedAt: "2026-10-18T12:00:00Z", refreshAfterSeconds: 60,
    totals: { online: 1, total: 1, maintenance: 0, uptime30: 99.9, averageLatencyMs: 73 }, incidents: [],
    servers: [{ id: "ee-1", name: "Эстония VLESS", countryCode: "EE", status: "operational", uptime30: 99.9, latencyMs: 73, members: 1, membersOnline: 1 }],
  } }));
  for (const path of ["/status", "/"]) {
    await page.goto(path);
    const flag = page.getByRole("img", { name: "Флаг страны Эстония", exact: true });
    await expect(flag).toHaveCount(1);
    for (const theme of ["dark", "light"]) {
      await page.evaluate((value) => document.documentElement.dataset.theme = value, theme);
      await expect(flag).toBeVisible();
      const background = await flag.evaluate((element) => getComputedStyle(element).backgroundImage);
      expect(background).toContain("linear-gradient");
      expect(background).toContain("rgb(0, 114, 206)");
      expect(background).toContain("rgb(0, 0, 0)");
      expect(background).toContain("rgb(255, 255, 255)");
      expect(await flag.textContent()).toBe("");
      await expect(flag).toHaveScreenshot(`estonia-${path === "/" ? "home" : "status"}-${theme}.png`);
    }
  }
});
