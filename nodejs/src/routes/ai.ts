import { FastifyInstance } from "fastify";
import { runPipeline, runStep, getSession, setSession, deleteSession } from "../orchestrator/pipeline";
import { AgentContext } from "../types/context";
import { randomUUID } from "crypto";

export default async function aiRoutes(app: FastifyInstance) {

  app.post("/generate", {
    schema: {
      description: "Generate AI application",
      tags: ["AI"],
      body: { type: "object", required: ["prompt"], properties: { prompt: { type: "string" } } },
      response: { 200: { type: "object", additionalProperties: true } }
    }
  }, async (req, reply) => {
    const { prompt } = req.body as { prompt: string };
    const result = await runPipeline(prompt);
    return result;
  });

  // SSE full pipeline stream
  app.post("/generate/stream", {
    schema: {
      description: "Stream AI generation pipeline via SSE",
      tags: ["AI"],
      body: { type: "object", required: ["prompt"], properties: { prompt: { type: "string" } } }
    }
  }, async (req, reply) => {
    const { prompt } = req.body as { prompt: string };

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("Access-Control-Allow-Origin", "*");
    reply.raw.flushHeaders();

    const send = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      await runPipeline(prompt, send);
    } catch (err: any) {
      send("error", { message: err.message });
    } finally {
      reply.raw.end();
    }
  });

  // ── Step-by-step API ──────────────────────────────────────────────────────

  const STEPS = ["planning", "techstack", "usecases", "compliance", "systemdesign", "structure", "prompt", "backend", "frontend", "database", "validation"];

  // Start a new session
  app.post("/session/start", {
    schema: {
      description: "Start a new pipeline session",
      tags: ["AI"],
      body: { type: "object", required: ["prompt"], properties: { prompt: { type: "string" } } },
      response: { 200: { type: "object", properties: { sessionId: { type: "string" }, steps: { type: "array" } } } }
    }
  }, async (req) => {
    const { prompt } = req.body as { prompt: string };
    const sessionId = randomUUID();
    setSession(sessionId, { userPrompt: prompt, rules: [] });
    return { sessionId, steps: STEPS };
  });

  // Execute a single step with SSE streaming logs
  app.get("/session/:sessionId/step/:stepName/stream", {
    schema: {
      description: "Execute a pipeline step and stream logs via SSE",
      tags: ["AI"],
      params: {
        type: "object",
        properties: { sessionId: { type: "string" }, stepName: { type: "string" } }
      }
    }
  }, async (req, reply) => {
    const { sessionId, stepName } = req.params as { sessionId: string; stepName: string };

    const ctx = getSession(sessionId);
    if (!ctx) {
      reply.status(404).send({ error: "Session not found" });
      return;
    }

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("Access-Control-Allow-Origin", "*");
    reply.raw.flushHeaders();

    const send = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const result = await runStep(stepName, ctx, send);
      setSession(sessionId, result.ctx);

      if (result.done) {
        if (result.finalResult) {
          send("done", result.finalResult);
        }
        deleteSession(sessionId);
      } else {
        send("step_done", { step: stepName });
      }
    } catch (err: any) {
      send("error", { message: err.message });
    } finally {
      reply.raw.end();
    }
  });
}
