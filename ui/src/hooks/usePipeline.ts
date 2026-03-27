import { useState, useCallback } from "react";
import { PipelineStep, GenerationResult } from "../types";

const BASE = "http://localhost:3000/api/ai";

const STEPS = [
  { name: "planning",     step: 1,  label: "Planning" },
  { name: "techstack",    step: 2,  label: "Tech Stack" },
  { name: "usecases",     step: 3,  label: "Use Cases" },
  { name: "compliance",   step: 4,  label: "Compliance" },
  { name: "systemdesign", step: 5,  label: "System Design" },
  { name: "structure",    step: 6,  label: "Folder Structure" },
  { name: "prompt",       step: 7,  label: "Prompt Builder" },
  { name: "backend",      step: 8,  label: "Backend Generation" },
  { name: "frontend",     step: 9,  label: "Frontend Generation" },
  { name: "database",     step: 10, label: "Database Generation" },
  { name: "validation",   step: 11, label: "Validation" },
];

function buildInitialSteps(): PipelineStep[] {
  return STEPS.map(s => ({ step: s.step, label: s.label, status: "idle" }));
}

// stepTokens: map of stepNumber -> accumulated text from real OpenAI stream
export type StepTokensMap = Record<number, string>;

export function usePipeline() {
  const [steps, setSteps] = useState<PipelineStep[]>(buildInitialSteps());
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [partialResult, setPartialResult] = useState<Partial<GenerationResult>>({});
  const [chatMessage, setChatMessage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepTokens, setStepTokens] = useState<StepTokensMap>({});
  const [prompt, setPrompt] = useState<string>("");

  const updateStep = useCallback((stepNum: number, patch: Partial<PipelineStep>) => {
    setSteps(prev => prev.map(s => s.step === stepNum ? { ...s, ...patch } : s));
  }, []);

  const appendToken = useCallback((stepNum: number, text: string) => {
    setStepTokens(prev => ({ ...prev, [stepNum]: (prev[stepNum] ?? "") + text }));
  }, []);

  const streamStep = useCallback(
    (sessionId: string, stepName: string): Promise<{ done: boolean; result?: GenerationResult; chat?: string }> => {
      return new Promise((resolve, reject) => {
        const es = new EventSource(`${BASE}/session/${sessionId}/step/${stepName}/stream`);

        es.addEventListener("step", (e) => {
          const payload = JSON.parse(e.data);
          updateStep(payload.step, { status: payload.status, data: payload.data, label: payload.label });

          // ✅ Show files immediately when each code agent completes — no waiting for validation
          if (payload.status === "completed" && payload.data?.fileList?.length) {
            if (stepName === "backend")  setPartialResult(prev => ({ ...prev, backend:  payload.data.fileList }));
            if (stepName === "frontend") setPartialResult(prev => ({ ...prev, frontend: payload.data.fileList }));
            if (stepName === "database") setPartialResult(prev => ({ ...prev, database: payload.data.fileList }));
          }
        });

        es.addEventListener("token", (e) => {
          const payload = JSON.parse(e.data);
          appendToken(payload.step, payload.text);
        });

        es.addEventListener("step_done", () => {
          es.close();
          resolve({ done: false });
        });

        es.addEventListener("done", (e) => {
          es.close();
          resolve({ done: true, result: JSON.parse(e.data) });
        });

        es.addEventListener("chat", (e) => {
          es.close();
          resolve({ done: true, chat: JSON.parse(e.data).message });
        });

        es.addEventListener("error", (e: any) => {
          es.close();
          try {
            const payload = JSON.parse(e.data);
            reject(new Error(payload.message));
          } catch {
            reject(new Error("Stream connection error"));
          }
        });
      });
    },
    [updateStep, appendToken]
  );

  const run = useCallback(async (prompt: string) => {
    setSteps(buildInitialSteps());
    setResult(null);
    setPartialResult({});
    setChatMessage(null);
    setError(null);
    setStepTokens({});
    setPrompt(prompt);
    setRunning(true);

    try {
      const res = await fetch(`${BASE}/session/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`Failed to start session: ${res.status}`);
      const { sessionId } = await res.json();

      for (const step of STEPS) {
        const { done, result: finalResult, chat } = await streamStep(sessionId, step.name);
        if (chat) { setChatMessage(chat); break; }
        if (done && finalResult) { setResult(finalResult); break; }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  }, [streamStep]);

  const completedSteps = steps.filter(s => s.status === "completed").length;
  const progress = Math.round((completedSteps / STEPS.length) * 100);

  return { steps, result, partialResult, chatMessage, running, error, progress, stepTokens, prompt, run };
}
