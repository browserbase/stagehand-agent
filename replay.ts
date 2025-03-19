/**
 * 🤘 Welcome to Stagehand!
 *
 * To edit config, see stagehand.config.ts
 *
 */
import { Page, BrowserContext, Stagehand } from "@browserbasehq/stagehand";
import dotenv from "dotenv";
dotenv.config();

export async function main({
  page,
  context,
  stagehand,
}: {
  page: Page; // Playwright Page with act, extract, and observe methods
  context: BrowserContext; // Playwright BrowserContext
  stagehand: Stagehand; // Stagehand instance
}) {
  await page.goto("https://www.google.com");
  await page.act({
    description: "The search combobox where users can type their queries.",
    method: "fill",
    arguments: ["NVDA stock price"],
    selector:
      "xpath=/html/body[1]/div[1]/div[3]/form[1]/div[1]/div[1]/div[1]/div[1]/div[2]/textarea[1]",
  });
  await page.extract(
    "the displayed NVDA stock price in the search suggestions",
  );
  await stagehand.close();
}
