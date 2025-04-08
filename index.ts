#!/usr/bin/env node

// Set NODE_NO_WARNINGS to suppress deprecation warnings
process.env.NODE_NO_WARNINGS = "1";
process.env.NODE_OPTIONS = "--no-deprecation";

import { main } from "./src/agent.js";
import dotenv from "dotenv";
import chalk from "chalk";
import { checkAndPromptApiKeys, question } from "./src/utils.js";

// Load environment variables
dotenv.config();
// Get query from command line argument if provided, otherwise use readline
const queryFromArgs = process.argv[2];

async function run() {
  console.log("🤘 Welcome to", chalk.yellow("Stagehand!"), "🤘");
  console.log(chalk.gray("\nLoading..."));
  const spinner = ["|", "/", "-", "\\"];
  let i = 0;
  const loadingInterval = setInterval(() => {
    process.stdout.write(`\r${spinner[i++ % spinner.length]}`);
  }, 100);
  // Clear interval after 2 seconds
  await new Promise((resolve) =>
    setTimeout(() => {
      clearInterval(loadingInterval);
      process.stdout.write("\r"); // Clear the spinner
      resolve(true);
    }, 3000)
  );
  await checkAndPromptApiKeys();

  if (queryFromArgs) {
    main(queryFromArgs);
  } else {
    const query = await question(chalk.yellow("\n\nEnter your query: "));
    main(query);
  }
}

run().catch(console.error);
