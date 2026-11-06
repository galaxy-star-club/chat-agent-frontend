import { expect, test } from "@playwright/test";

test("the built frontend reaches the real backend from the browser", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in to your workspace" })).toBeVisible();
  await expect(page.getByText("API connected", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Health endpoint responded successfully. Sign in to open your tasks.")).toBeVisible();
  await page.getByRole("button", { name: "Check again" }).click();
  await expect(page.getByText("API connected", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole("heading", { name: "Infrastructure connection" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
