import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/healthz/ai", async (_req, res) => {
  const baseURL = process.env.AI_INTEGRATIONS_OLLAMA_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OLLAMA_API_KEY;

  if (!baseURL) {
    return res.status(500).json({ ok: false, error: "AI_INTEGRATIONS_OLLAMA_BASE_URL is not set" });
  }

  try {
    const url = new URL("models", baseURL).toString();
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
      if (baseURL.includes("generativelanguage.googleapis.com")) {
        headers["x-goog-api-key"] = apiKey;
      }
    }

    const response = await fetch(url, { headers });
    const text = await response.text();
    const preview = text.length > 2000 ? `${text.slice(0, 2000)}...` : text;

    return res.status(response.ok ? 200 : response.status).json({
      ok: response.ok,
      status: response.status,
      url,
      bodyPreview: preview,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
});

export default router;
