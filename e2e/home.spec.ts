import { test, expect } from "@playwright/test";

test("landing page loads with login button", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Learn My Favs")).toBeVisible();
  await expect(page.getByText("Login with Spotify")).toBeVisible();
});

test("landing page shows feature cards", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Pick Your Instrument")).toBeVisible();
  await expect(page.getByText("See Difficulty")).toBeVisible();
  await expect(page.getByText("Get Tabs & Jam")).toBeVisible();
});
