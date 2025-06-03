#!/usr/bin/env node

// Set NODE_NO_WARNINGS to suppress deprecation warnings
process.env.NODE_NO_WARNINGS = "1";
process.env.NODE_OPTIONS = "--no-deprecation";

import readline from "readline";
import { main } from "./index.js";
import dotenv from "dotenv";
import chalk from "chalk";
import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config.js";

// Load environment variables
dotenv.config();

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promisify readline question
const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

// Check and prompt for required API keys
async function checkAndPromptApiKeys() {
  let envUpdated = false;

  if (!process.env.ANTHROPIC_API_KEY) {
    const anthropicKey = await question(
      chalk.yellow("No Anthropic API key found. ") +
        chalk.gray(
          "We use Anthropic Claude 3.7 Sonnet to power our agent's tool choice decisions.\n\n"
        ) +
        chalk.cyan("Please enter your Anthropic API key: ")
    );
    process.env.ANTHROPIC_API_KEY = anthropicKey;
    envUpdated = true;
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const geminiKey = await question(
      chalk.yellow("No Gemini API key found. ") +
        chalk.gray(
          "We use Gemini 2.0 flash to power our agent action execution.\n\n"
        ) +
        chalk.cyan(
          "Please enter your Gemini API key (https://aistudio.google.com/apikey): "
        )
    );
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = geminiKey;
    envUpdated = true;
  }

  if (envUpdated) {
    console.log("\nAPI keys have been set for this session.");
    console.log("To persist these keys, add them to your .env file.");
  }
}

// Get query from command line argument if provided, otherwise use readline
const queryFromArgs = process.argv[2];

async function run() {
  console.log("🤘 Welcome to Stagehand!");
  console.log("Setting up your environment...");
  await checkAndPromptApiKeys();

  const stagehand = new Stagehand({
    ...StagehandConfig,
  });
  await stagehand.init();

  if (stagehand.browserbaseSessionID) {
    console.log(
      `Browserbase session: https://www.browserbase.com/sessions/${stagehand.browserbaseSessionID}`
    );
  }

  if (queryFromArgs) {
    main(queryFromArgs, stagehand);
  } else {
    const query = await question(chalk.yellow("\n\nEnter your query: "));
    await main(query, stagehand);
    await stagehand.close();
    rl.close();
  }
}

run().catch(console.error);
