import { useState, useCallback, useRef } from "react";
import type { PipelineStep, GenerationResult } from "../type/types";
import BASE_URL from "../../Config";

const BASE = `${BASE_URL}/vibecode-service`;

const STEPS = [
  { name: "planning",    step: 1,  label: "Planning" },
  { name: "clarification", step: 2, label: "Clarification" },
  { name: "techstack",  step: 3,  label: "Tech Stack" },
  { name: "usecases",   step: 4,  label: "Use Cases" },
  { name: "compliance", step: 5,  label: "Compliance" },
  { name: "systemdesign", step: 6, label: "System Design" },
  { name: "structure",  step: 7,  label: "Folder Structure" },
  { name: "prompt",     step: 8,  label: "Prompt Builder" },
  { name: "backend",    step: 9,  label: "Backend Generation" },
  { name: "frontend",   step: 10, label: "Frontend Generation" },
  { name: "database",   step: 11, label: "Database Generation" },
  { name: "validation", step: 12, label: "Validation" },
];

function buildInitialSteps(): PipelineStep[] {
  return STEPS.map(s => ({ step: s.step, label: s.label, status: "idle" as const }));
}

export type StepTokensMap = Record<number, string>;

export interface ClarificationQuestion {
  id: string;
  question: string;
  options?: string[];
  type?: string;
}

export interface ConversationTurn {
  prompt: string;
  steps: PipelineStep[];
  stepTokens: StepTokensMap;
  result: GenerationResult | null;
  partialResult: Partial<GenerationResult>;
  chatMessage: string | null;
  error: string | null;
}

type SSEResult = { done: boolean; result?: GenerationResult; chat?: string; waitingForAnswer?: boolean };

type LocalUpdater = {
  updateStep: (stepNum: number, patch: Partial<PipelineStep>) => void;
  appendToken: (stepNum: number, text: string) => void;
  setPartial: (updater: (prev: Partial<GenerationResult>) => Partial<GenerationResult>) => void;
  setClarification: (q: (ClarificationQuestion & { index: number; total: number }) | null) => void;
};

function streamStepSSE(sessionId: string, stepName: string, u: LocalUpdater): Promise<SSEResult> {
  return new Promise((resolve, reject) => {
    fetch(`${BASE}/session/${sessionId}/step/${stepName}`, { method: "POST" })
      .then(res => {
        if (!res.ok) { reject(new Error(`Step ${stepName} failed: ${res.status}`)); return; }
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let lastEvent = "";

        const read = (): Promise<void> => reader.read().then(({ done, value }) => {
          if (done) { resolve({ done: false }); return; }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("event:")) { lastEvent = line.replace("event:", "").trim(); continue; }
            if (!line.startsWith("data:")) continue;
            const json = line.replace("data:", "").trim();
            try {
              const payload = JSON.parse(json);
              if (lastEvent === "step") {
                u.updateStep(payload.step, { status: payload.status, data: payload.data, label: payload.label });
                if (payload.status === "completed" && payload.data?.fileList?.length) {
                  if (payload.label === "Backend Generation")  u.setPartial(p => ({ ...p, backend:  payload.data.fileList }));
                  if (payload.label === "Frontend Generation") u.setPartial(p => ({ ...p, frontend: payload.data.fileList }));
                  if (payload.label === "Database Generation") u.setPartial(p => ({ ...p, database: payload.data.fileList }));
                }
              } else if (lastEvent === "token") {
                u.appendToken(payload.step, payload.text);
              } else if (lastEvent === "clarification-question") {
                u.setClarification({ ...payload.question, index: payload.index, total: payload.total });
              } else if (lastEvent === "clarification-waiting") {
                resolve({ done: true, waitingForAnswer: true }); return;
              } else if (lastEvent === "done") {
                // If payload has all three generation arrays it's the final done
                // If it only has some (e.g. just backend), treat it like step_done and continue
                const isFullResult =
                  Array.isArray(payload?.backend) &&
                  Array.isArray(payload?.frontend) &&
                  Array.isArray(payload?.database) &&
                  (payload.backend.length > 0 || payload.frontend.length > 0 || payload.database.length > 0);
                if (isFullResult) {
                  resolve({ done: true, result: payload }); return;
                } else {
                  resolve({ done: false }); return;
                }
              } else if (lastEvent === "chat") {
                resolve({ done: true, chat: payload.message }); return;
              } else if (lastEvent === "step_done") {
                resolve({ done: false }); return;
              } else if (lastEvent === "error") {
                reject(new Error(payload.message)); return;
              }
            } catch { /* partial chunk */ }
          }
          return read();
        });
        read().catch(reject);
      }).catch(reject);
  });
}

export function usePipeline() {
  const [steps, setSteps] = useState<PipelineStep[]>(buildInitialSteps());
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [partialResult, setPartialResult] = useState<Partial<GenerationResult>>({});
  const [chatMessage, setChatMessage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepTokens, setStepTokens] = useState<StepTokensMap>({});
  const [prompt, setPrompt] = useState<string>("");
  const [clarificationQuestion, setClarificationQuestion] = useState<(ClarificationQuestion & { index: number; total: number }) | null>(null);
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const sessionIdRef = useRef<string | null>(null);

  const updateStep = useCallback((stepNum: number, patch: Partial<PipelineStep>) => {
    setSteps(prev => prev.map(s => s.step === stepNum ? { ...s, ...patch } : s));
  }, []);

  const appendToken = useCallback((stepNum: number, text: string) => {
    setStepTokens(prev => ({ ...prev, [stepNum]: (prev[stepNum] ?? "") + text }));
  }, []);

  const run = useCallback(async (userPrompt: string) => {
    // Reset UI for new run
    setSteps(buildInitialSteps());
    setResult(null);
    setPartialResult({});
    setChatMessage(null);
    setError(null);
    setStepTokens({});
    setClarificationQuestion(null);
    setPrompt(userPrompt);
    setRunning(true);

    // Local accumulators — track synchronously to avoid React async state race
    let localSteps = buildInitialSteps();
    let localTokens: StepTokensMap = {};
    let localPartial: Partial<GenerationResult> = {};
    let localResult: GenerationResult | null = null;
    let localChat: string | null = null;
    let localError: string | null = null;

    const u: LocalUpdater = {
      updateStep: (stepNum, patch) => {
        localSteps = localSteps.map(s => s.step === stepNum ? { ...s, ...patch } : s);
        updateStep(stepNum, patch);
      },
      appendToken: (stepNum, text) => {
        localTokens = { ...localTokens, [stepNum]: (localTokens[stepNum] ?? "") + text };
        appendToken(stepNum, text);
      },
      setPartial: (updater) => {
        localPartial = updater(localPartial);
        setPartialResult(updater);
      },
      setClarification: (q) => setClarificationQuestion(q),
    };

    try {
      const res = await fetch(`${BASE}/session/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt }),
      });
      if (!res.ok) throw new Error(`Failed to start session: ${res.status}`);
      const { sessionId } = await res.json();
      sessionIdRef.current = sessionId;

      for (const step of STEPS) {
        const r = await streamStepSSE(sessionId, step.name, u);
        if (r.chat) {
          localChat = r.chat;
          setChatMessage(r.chat);
          break;
        }
        if (r.waitingForAnswer) {
          setPaused(true);
          setRunning(false);
          return;
        }
        if (r.done && r.result) {
          localResult = r.result;
          setResult(r.result);
          break;
        }
      }

      // If loop completed all steps but no explicit done event with full result,
      // build the final result from accumulated partialResult
      if (!localResult && (localPartial.backend?.length || localPartial.frontend?.length || localPartial.database?.length)) {
        localResult = {
          backend:  localPartial.backend  ?? [],
          frontend: localPartial.frontend ?? [],
          database: localPartial.database ?? [],
        };
        setResult(localResult);
      }
    } catch (err: unknown) {
      localError = err instanceof Error ? err.message : "Unknown error";
      setError(localError);
    }

    setRunning(false);
    // Push completed turn to history with accurate local state
    setHistory(prev => [...prev, {
      prompt: userPrompt,
      steps: localSteps,
      stepTokens: localTokens,
      result: localResult,
      partialResult: localPartial,
      chatMessage: localChat,
      error: localError,
    }]);
  }, [updateStep, appendToken]);

  const answerQuestion = useCallback(async (answer: string) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;

    setClarificationQuestion(null);
    setPaused(false);
    setRunning(true);

    try {
      const res = await fetch(`${BASE}/session/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      if (!res.ok) throw new Error(`Answer failed: ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let lastEvent = "";

      const read = (): Promise<void> => reader.read().then(({ done, value }) => {
        if (done) { return; }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event:")) { lastEvent = line.replace("event:", "").trim(); continue; }
          if (!line.startsWith("data:")) continue;
          const json = line.replace("data:", "").trim();
          try {
            const payload = JSON.parse(json);
            if (lastEvent === "step") {
              updateStep(payload.step, { status: payload.status, data: payload.data, label: payload.label });
              if (payload.status === "completed" && payload.data?.fileList?.length) {
                if (payload.label === "Backend Generation")  setPartialResult(prev => ({ ...prev, backend:  payload.data.fileList }));
                if (payload.label === "Frontend Generation") setPartialResult(prev => ({ ...prev, frontend: payload.data.fileList }));
                if (payload.label === "Database Generation") setPartialResult(prev => ({ ...prev, database: payload.data.fileList }));
              }
            } else if (lastEvent === "token") {
              appendToken(payload.step, payload.text);
            } else if (lastEvent === "clarification-question") {
              setClarificationQuestion({ ...payload.question, index: payload.index, total: payload.total });
            } else if (lastEvent === "done") {
              setResult(payload);
              setRunning(false);
              return;
            } else if (lastEvent === "error") {
              setError(payload.message);
              setRunning(false);
              return;
            }
          } catch { /* partial */ }
        }
        return read();
      });

      await read();
    } catch (err: any) {
      setError(err.message);
      setRunning(false);
    }
  }, [updateStep, appendToken]);

  const completedSteps = steps.filter(s => s.status === "completed").length;
  const progress = Math.round((completedSteps / STEPS.length) * 100);

  return { steps, result, partialResult, chatMessage, running, paused, error, progress, stepTokens, prompt, clarificationQuestion, history, run, answerQuestion };
}
