import OpenAI from "openai";

if (!process.env.AI_INTEGRATIONS_OLLAMA_BASE_URL) {
  throw new Error(
    "AI_INTEGRATIONS_OLLAMA_BASE_URL must be set for OpenAI-compatible API access.",
  );
}

const baseURL = process.env.AI_INTEGRATIONS_OLLAMA_BASE_URL;
const apiKey = process.env.AI_INTEGRATIONS_OLLAMA_API_KEY || "ollama";

export const openai = new OpenAI({
  apiKey,
  baseURL,
  defaultHeaders:
    baseURL && baseURL.includes("generativelanguage.googleapis.com")
      ? { "x-goog-api-key": apiKey }
      : undefined,
});
