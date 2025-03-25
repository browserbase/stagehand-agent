# 🤘 Stagehand Agent

A powerful browser automation agent built with [Stagehand](https://github.com/browserbase/stagehand) that amplifies Playwright with `act`, `extract`, and `observe` capabilities.

## 🚀 Installation

```bash
npx stagehand-ai
```

## 🛠️ Usage

```typescript
import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config";

const stagehand = new Stagehand(StagehandConfig);
await stagehand.init();

const page = stagehand.page; // Playwright Page with act, extract, and observe methods
const context = stagehand.context; // Playwright BrowserContext
```

### Key Features

- **Observe**: Get actions to execute based on natural language instructions
- **Act**: Execute actions on web pages
- **Extract**: Extract data from web pages using natural language

### Example Usage

```typescript
// Click a button
const results = await page.observe("Click the sign in button");
await page.act(results[0]);

// Extract data
const { text } = await page.extract({
  instruction: "extract the sign in button text",
  schema: z.object({
    text: z.string(),
  }),
  useTextExtract: true,
});
```

## 🔧 Dependencies

This package requires:

- Node.js (Latest LTS version recommended)
- pnpm (v9.15.0 or later)
- Playwright browsers (automatically installed via postinstall script)

## 📝 Environment Variables

Make sure to set up your environment variables in a `.env` file. Required variables will depend on your specific configuration.

## 📄 License

MIT
