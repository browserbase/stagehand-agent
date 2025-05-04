import { generateObject, LanguageModel, streamText } from "ai";
import { Stagehand } from "@browserbasehq/stagehand";
import { getTools } from "./tools.js";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

/**
 * Main function that executes an agent trajectory with Stagehand
 * @param query The prompt to be used for the agent trajectory
 * @param schema Optional Zod schema defining the structure of the output from the agent trajectory
 * @param config Configuration object for the models used
 * @param config.actionModel The model used to perform Stagehand actions (act/extract/observe)
 * @param config.structuredOutputModel The model used to generate structured output from the agent trajectory
 * @param config.cuaModel The model used to perform CUA actions (act/extract/observe)
 */
export async function main(
  query: string,
  stagehand: Stagehand,
  schema?: z.ZodTypeAny,
  config: {
    trajectoryModel: LanguageModel;
    actionModel: LanguageModel;
    structuredOutputModel: LanguageModel;
    cuaModel:
      | "openai/computer-use-preview"
      | "anthropic/claude-3-7-sonnet-latest"
      | "anthropic/claude-3-5-sonnet-latest";
  } = {
    actionModel: openai("gpt-4o-mini"),
    structuredOutputModel: openai("gpt-4o-mini"),
    cuaModel: "openai/computer-use-preview",
    // trajectoryModel: anthropic("claude-3-7-sonnet-latest"),
    trajectoryModel: google("gemini-2.0-flash"),
  }
) {
  const prompt = `You are a helpful assistant that can browse the web.
		You are given the following prompt:
		${query}
		${
      schema
        ? `Answer the prompt and be sure to contain a detailed response that covers at least the following requested data: ${JSON.stringify(
            schema
          )}`
        : ""
    }
		You may need to browse the web to find the answer.
		You may not need to browse the web at all; you may already know the answer.
		Do not ask follow up questions; I trust your judgement.
	  `;
  const page = stagehand.page;

  const result = streamText({
    model: config.trajectoryModel, // ONLY CLAUDE IS SUPPORTED FOR TRAJECTORY
    tools: getTools(page, stagehand, config.actionModel),
    toolCallStreaming: true,
    system:
      "You are a helpful assistant that can browse the web. You are given a prompt and you may need to browse the web to find the answer. You may not need to browse the web at all; you may already know the answer. Do not ask follow up questions; I trust your judgement.",
    prompt,
    maxSteps: 50,
    onStepFinish: (step) => {
      // Add token usage data here
    },
    onFinish: async (result) => {
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
      if (schema) {
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
