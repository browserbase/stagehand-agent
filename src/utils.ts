#!/usr/bin/env node

import readline from "readline";
import chalk from "chalk";

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promisify readline question
export const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

// Check and prompt for required API keys
export async function checkAndPromptApiKeys() {
  let envUpdated = false;

  if (!process.env.ANTHROPIC_API_KEY) {
    const anthropicKey = await question(
      chalk.yellow("No Anthropic API key found. ") +
        chalk.gray(
          "We use Anthropic Claude 3.7 Sonnet to power our agent trajectory reasoning.\n\n"
        ) +
        chalk.cyan("Please enter your Anthropic API key: ")
    );
    process.env.ANTHROPIC_API_KEY = anthropicKey;
    envUpdated = true;
  }

  if (!process.env.OPENAI_API_KEY) {
    const openaiKey = await question(
      chalk.yellow("No OpenAI API key found. ") +
        chalk.gray(
          "We suggest using OpenAI GPT-4o-mini to power our agent action execution.\n\n"
        ) +
        chalk.cyan("Please enter your OpenAI API key: ")
    );
    process.env.OPENAI_API_KEY = openaiKey;
    envUpdated = true;
  }

  if (envUpdated) {
    console.log("\nAPI keys have been set for this session.");
    console.log("To persist these keys, add them to your .env file.");
  }
}
