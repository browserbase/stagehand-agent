# 🤘 Stagehand Agent

A powerful browser automation agent built with [Stagehand](https://github.com/browserbase/stagehand) that amplifies Playwright with `act`, `extract`, and `observe` capabilities.

## 🚀 Installation

```bash
pnpm install
pnpm run cli
```

## 🛠️ Usage

- `cli.ts` is the entry point for the CLI.
- `index.ts` contains the actual agent loop.

## How it works

![agent.png](./agent.png)

- Trajectory Model: Claude 3.5 Sonnet
- Action Model: GPT 4o Mini
- Structured Output Model: GPT 4o Mini
- CUA Model: OpenAI Computer Use Preview
