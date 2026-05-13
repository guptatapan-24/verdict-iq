import OpenAI from "openai";

if (!process.env.AI_INTEGRATIONS_GROQ_BASE_URL) {
  throw new Error(
    "AI_INTEGRATIONS_GROQ_BASE_URL must be set for Groq (OpenAI-compatible) API access.",
  );
}

if (!process.env.AI_INTEGRATIONS_GROQ_API_KEY) {
  throw new Error(
    "AI_INTEGRATIONS_GROQ_API_KEY must be set for Groq (OpenAI-compatible) API access.",
  );
}

export const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_GROQ_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_GROQ_BASE_URL,
});
