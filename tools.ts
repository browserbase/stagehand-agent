import { Page, Stagehand } from "@browserbasehq/stagehand";
import { generateId, generateText, LanguageModel, tool } from "ai";
import { z } from "zod";

const log = (action: string, ...args: unknown[]) => {
  const formattedArgs = args
    .map((arg) =>
      typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg
    )
    .join(" ");
  console.log(
    `\n<stagehand>[${action.toUpperCase()}] ${formattedArgs}</stagehand>\n`
  );
};

export const getTools = (
  page: Page,
  stagehand: Stagehand,
  model: LanguageModel
) => ({
  stagehand_close: tool({
    description: "End the browser session",
    parameters: z.object({}),
    execute: async () => {
      await stagehand.close();
      return "Closed the browser session";
    },
  }),
  stagehand_wait: tool({
    description:
      "Wait for a specific amount of time. Useful when you need to wait for a page to load or for an element to be visible.",
    parameters: z.object({
      seconds: z.number().describe("The number of seconds to wait"),
    }),
    execute: async ({ seconds }) => {
      await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
      return `Waited for ${seconds} seconds`;
    },
  }),
  stagehand_back: tool({
    description: "Go back to the previous page",
    parameters: z.object({}),
    execute: async () => {
      await page.goBack();
      return "Navigated back";
    },
  }),
  stagehand_navigate: tool({
    description:
      "Navigate to a URL in the browser. Only use this tool with URLs you're confident will work and stay up to date. Otherwise use https://google.com as the starting point",
    parameters: z.object({
      url: z.string().describe("The URL to navigate to"),
    }),
    execute: async ({ url }) => {
      log("NAVIGATE", url);
      await Promise.race([
        page.goto(url),
        new Promise((resolve) =>
          setTimeout(() => resolve(new Error("Navigation timed out")), 10_000)
        ),
      ]);
      return `Navigated to: ${url}`;
    },
    experimental_toToolResultContent: (result) => {
      return [{ type: "text", text: result }];
    },
  }),

  stagehand_iframe: tool({
    description: "Check if the page contains an iframe",
    parameters: z.object({}),
    execute: async () => {
      const iframes = await page.observe("all iframes");
      const useAgent =
        iframes.filter((x) => x.method === "not-supported").length > 0;
      return useAgent;
    },
  }),

  stagehand_scroll_one_chunk: tool({
    description: "Scroll one viewport height down",
    parameters: z.object({}),
    execute: async () => {
      await page.evaluate(() => {
        const viewportHeight = window.innerHeight;
        window.scrollBy(0, viewportHeight);
      });
      return "Scrolled one viewport height down";
    },
  }),

  stagehand_act: tool({
    description: `Performs an action on a web page element. Act actions should be as atomic and 
        specific as possible, i.e. "Click the sign in button" or "Type 'hello' into the search input". 
		When deciding to scroll, include a percentage of the page to scroll. For example, "Scroll 50% of the page" or "Scroll to the bottom of the page".
        AVOID actions that are more than one step, i.e. "Order me pizza" or "Send an email to Paul 
        asking him to call me".`,
    parameters: z.object({
      action: z.string()
        .describe(`The action to perform. Should be as atomic and specific as possible, 
          i.e. 'Click the sign in button' or 'Type 'hello' into the search input'. AVOID actions that are more than one 
          step, i.e. 'Order me pizza' or 'Send an email to Paul asking him to call me'. The instruction should be just as specific as possible, 
          and have a strong correlation to the text on the page. If unsure, use observe before using act.`),
      variables: z.record(z.any()).optional()
        .describe(`Variables used in the action template. ONLY use variables if you're dealing 
          with sensitive data or dynamic content. For example, if you're logging in to a website, 
          you can use a variable for the password. When using variables, you MUST have the variable
          key in the action template. For example: {"action": "Fill in the password", "variables": {"password": "123456"}}`),
      hasIframe: z
        .boolean()
        .describe(
          "Whether the page contains an iframe. Use the stagehand_iframe tool to check."
        ),
    }),
    execute: async ({ action, variables, hasIframe }) => {
      log("ACT", { action, variables, hasIframe });
      if (hasIframe) {
        log("AGENT", "Using CUA agent");
        const agent = stagehand.agent({
          provider: "anthropic",
          model: "claude-3-7-sonnet-20250219",
          instructions: `You are a helpful assistant that can use a web browser.
        	  You are currently on the following page: ${page.url()}.
        	  Do not ask follow up questions, the user will trust your judgement.`,
          options: {
            apiKey: process.env.ANTHROPIC_API_KEY,
          },
        });
        await agent.execute({
          instruction: action,
          maxSteps: 2,
        });
        log("AGENT", "Execution complete");
      } else {
        log("ACT", "Using page.act");
        await Promise.race([
          page.act({
            action,
            variables,
            slowDomBasedAct: false,
          }),
          new Promise((resolve) =>
            setTimeout(async () => {
              resolve(new Error("Action timed out"));
            }, 10_000)
          ),
        ]);
        log("ACT", "Execution complete");
      }
      return `Action performed: ${action}`;
    },
    experimental_toToolResultContent: (result) => {
      return [{ type: "text", text: result }];
    },
  }),

  stagehand_extract: tool({
    description: `Extracts text from the current page.`,
    parameters: z.object({
      searchInstruction: z
        .string()
        .describe(
          "If you want to extract specific data from the page, describe what you want to extract here in a sentence or two. Otherwise, leave blank."
        )
        .optional(),
    }),
    execute: async ({ searchInstruction }) => {
      log("EXTRACT", page.url());
      const bodyText = await page.evaluate(() => document.body.innerText);
      let content = bodyText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => {
          if (!line) return false;

          if (
            (line.includes("{") && line.includes("}")) ||
            line.includes("@keyframes") ||
            line.match(/^\.[a-zA-Z0-9_-]+\s*{/) ||
            line.match(/^[a-zA-Z-]+:[a-zA-Z0-9%\s\(\)\.,-]+;$/)
          ) {
            return false;
          }
          return true;
        })
        .map((line) => {
          return line.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
            String.fromCharCode(parseInt(hex, 16))
          );
        });
      if (searchInstruction) {
        log("EXTRACT", "Using search instruction:", searchInstruction);
        const result = await generateText({
          model: model,
          prompt: `You want to extract the following data from the page: ${searchInstruction}. 
		  Extract the data from the page. If there is insufficient information, make it very clear that you are unable to adequately extract the requested data.
		  If multiple pieces of information are requested, extract as much as you can without assuming or making up information.
		  The page content is as follows: 
		  ${content.join("\n")}`,
          system: `You are a helpful assistant that can extract data from a web page.`,
        });
        content = result.text.split("\n");
        log("EXTRACT", "Content:", content);
      }
      return content.join("\n");
    },
    experimental_toToolResultContent: (result) => {
      return [{ type: "text", text: `Extracted content:\n${result}` }];
    },
  }),

  stagehand_observe: tool({
    description:
      "Observes elements on the web page. Use this tool to observe elements that you can later use in an action. Use observe instead of extract when dealing with actionable (interactable) elements rather than text. More often than not, you'll want to use extract instead of observe when dealing with scraping or extracting structured text.",
    parameters: z.object({
      instruction: z
        .string()
        .describe(
          "Instruction for observation (e.g., 'find the login button'). This instruction must be extremely specific."
        ),
    }),
    execute: async ({ instruction }) => {
      log("OBSERVE", instruction);
      const observations = await page.observe({
        instruction,
        returnAction: false,
      });
      return JSON.stringify(observations);
    },
    experimental_toToolResultContent: (result) => {
      return [{ type: "text", text: `Observations: ${result}` }];
    },
  }),

  screenshot: tool({
    description:
      "Takes a screenshot of the current page. Use this tool to learn where you are on the page when controlling the browser with Stagehand. Only use this tool when the other tools are not sufficient to get the information you need.",
    parameters: z.object({}),
    execute: async () => {
      const screenshotBuffer = await page.screenshot({
        fullPage: false,
      });
      return screenshotBuffer;
    },
    experimental_toToolResultContent: (result) => {
      return [
        {
          type: "image",
          data: result.toString("base64"),
          mimeType: "image/png",
        },
      ];
    },
  }),
});
