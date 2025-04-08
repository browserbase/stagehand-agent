import { generateObject, LanguageModel, streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { ConstructorParams, Stagehand } from "@browserbasehq/stagehand";
import { CUAModel, getTools } from "./tools.js";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { AISdkClient } from "./aisdk_client.js";

/**
 * Main function that executes an agent trajectory with Stagehand
 * @param query The prompt to be used for the agent trajectory
 * @param schema Optional Zod schema defining the structure of the output from the agent trajectory
 * @param config Configuration object for the models used
 * @param config.actionModel The model used to perform Stagehand actions (act/extract/observe)
 * @param config.structuredOutputModel The model used to generate structured output from the agent trajectory
 * @param config.cuaModel The model used to perform CUA actions (act/extract/observe)
 * @param config.trajectoryModel The model used to perform the agent trajectory (ONLY CLAUDE IS SUPPORTED)
 * @param config.stagehandConfig Configuration object for the Stagehand instance
 * @param config.systemPrompt The system prompt for the agent trajectory
 * @param config.maxSteps The maximum number of steps for the agent trajectory
 */
export async function main(
  query: string,
  config: {
    schema?: z.ZodTypeAny;
    trajectoryModel: LanguageModel;
    actionModel: LanguageModel;
    structuredOutputModel: LanguageModel;
    cuaModel: CUAModel;
    stagehandConfig: ConstructorParams;
    systemPrompt?: string;
    maxSteps?: number;
  } = {
    actionModel: openai("gpt-4o"),
    structuredOutputModel: openai("gpt-4o-mini"),
    cuaModel: "anthropic/claude-3-7-sonnet-latest",
    trajectoryModel: anthropic("claude-3-7-sonnet-latest"),
    stagehandConfig: {
      env: "BROWSERBASE",
      verbose: 1,
    },
    systemPrompt:
      "You are a helpful assistant that can browse the web. You are given a prompt and you may need to browse the web to find the answer. You may not need to browse the web at all; you may already know the answer. Do not ask follow up questions; I trust your judgement.",
    maxSteps: 50,
  }
) {
  const prompt = `You are a helpful assistant that can browse the web.
		You are given the following prompt:
		${query}
		${
      config.schema
        ? `Answer the prompt and be sure to contain a detailed response that covers at least the following requested data: ${JSON.stringify(
            config.schema
          )}`
        : ""
    }
		You may need to browse the web to find the answer.
		You may not need to browse the web at all; you may already know the answer.
		Do not ask follow up questions; I trust your judgement.
	  `;
  const stagehand = new Stagehand({
    ...config.stagehandConfig,
    llmClient: new AISdkClient({ model: config.actionModel }),
  });
  await stagehand.init();
  await stagehand.page.goto("https://google.com");
  await stagehand.page.act("search for 'stagehand'");

  const page = stagehand.page;

  const result = streamText({
    model: config.trajectoryModel, // ONLY CLAUDE IS SUPPORTED FOR TRAJECTORY
    tools: getTools(page, stagehand, config.cuaModel, config.actionModel),
    toolCallStreaming: true,
    system: config.systemPrompt,
    prompt,
    maxSteps: config.maxSteps,
    onStepFinish: (step) => {
      // Add token usage data here
    },
    onFinish: async (result) => {
      console.log("\n\n\n---FINISHED---");
      await stagehand.close();
      const cleanedResult = result.response.messages.map((m) => {
        if (m.role === "tool") {
          return {
            ...m,
            // Remove screenshot content
            content: m.content.map((c) => {
              if (c.toolName === "screenshot") {
                return {
                  ...c,
                  result: [],
                  experimental_content: [],
                };
              }
              return c;
            }),
          };
        }
        return m;
      });
      if (config.schema) {
        console.log("Generating structured output...");
        const structuredResult = await generateObject({
          model: config.structuredOutputModel,
          prompt: `You are given the following data of a web browsing session: 
			${JSON.stringify(cleanedResult)}
			Extract the requested data. If there is insufficient information, make it very clear that you are unable to adequately extract the requested data.
			If multiple pieces of information are requested, extract as much as you can without assuming or making up information.`,
          output: "no-schema",
        });
        console.log("Structured output:", structuredResult);
      }
    },
  });

  // Log the text stream
  for await (const textPart of result.textStream) {
    process.stdout.write(textPart);
  }
}
