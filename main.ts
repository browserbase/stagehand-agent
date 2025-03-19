/**
 * 🤘 Welcome to Stagehand!
 *
 * TO RUN THIS PROJECT:
 * ```
 * npm install
 * npm run start
 * ```
 *
 * To edit config, see `stagehand.config.ts`
 *
 */
import {
  Page,
  BrowserContext,
  Stagehand,
  AgentAction,
} from "@browserbasehq/stagehand";
import chalk from "chalk";
import dotenv from "dotenv";
import { replay } from "./utils.js";
dotenv.config();

const INSTRUCTION = `
Extract the stock price of NVDA from Google
`.trim();

export async function main({
  page,
  context,
  stagehand,
}: {
  page: Page; // Playwright Page with act, extract, and observe methods
  context: BrowserContext; // Playwright BrowserContext
  stagehand: Stagehand; // Stagehand instance
}) {
  try {
    const agent = stagehand.agent();

    // Execute the agent
    console.log(`${chalk.cyan("↳")} Instruction: ${INSTRUCTION}`);

    const result = await agent.execute({
      instruction: INSTRUCTION,
      maxSteps: 20,
    });

    console.log(`${chalk.green("✓")} Execution complete`);
    console.log(`${chalk.yellow("⤷")} Result:`);
    console.log(JSON.stringify(result, null, 2));
    console.log(chalk.white(result.message));

    await replay(result);
    console.log(
      `View ${chalk.green("replay.ts")} to see the Stagehand replay!`
    );
  } catch (error) {
    console.log(`${chalk.red("✗")} Error: ${error}`);
  } finally {
    await stagehand.close();
  }
}

async function checkNewTab({
  page,
  context,
}: {
  page: Page;
  context: BrowserContext;
}) {
  const initialUrl = page.url();
  const newOpenedTab = await new Promise<Page | null>((resolve) => {
    context.once("page", (newPage) => resolve(newPage as Page));
    setTimeout(() => resolve(null), 3000);
  });

  if (newOpenedTab) {
    console.log({
      category: "action",
      message: "new page detected (new tab) with URL",
      level: 1,
      auxiliary: {
        url: { value: newOpenedTab.url(), type: "string" },
      },
    });
    await newOpenedTab.close();
    await page.goto(newOpenedTab.url());
    await page.waitForLoadState("domcontentloaded");
  }

  if (page.url() !== initialUrl) {
    console.log({
      category: "action",
      message: "new page detected with URL",
      level: 1,
      auxiliary: {
        url: { value: page.url(), type: "string" },
      },
    });
  }
}
