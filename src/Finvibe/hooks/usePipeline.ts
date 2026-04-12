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
                if (payload.status === "completed") {
                  const files = payload.data?.fileList || payload.data?.files;
                  if (Array.isArray(files) && files.length > 0) {
                    if (payload.label === "Backend Generation")  u.setPartial(p => ({ ...p, backend: files }));
                    if (payload.label === "Frontend Generation") u.setPartial(p => ({ ...p, frontend: files }));
                    if (payload.label === "Database Generation") u.setPartial(p => ({ ...p, database: files }));
                  }
                }
              } else if (lastEvent === "token") {
                u.appendToken(payload.step, payload.text);
              } else if (lastEvent === "clarification-question") {
                u.setClarification({ ...payload.question, index: payload.index, total: payload.total });
              } else if (lastEvent === "clarification-waiting") {
                resolve({ done: true, waitingForAnswer: true }); return;
              } else if (lastEvent === "done") {
                const backend  = Array.isArray(payload?.backend)  ? payload.backend  : [];
                const frontend = Array.isArray(payload?.frontend) ? payload.frontend : [];
                const database = Array.isArray(payload?.database) ? payload.database : [];
                if (backend.length > 0)  u.setPartial(p => ({ ...p, backend }));
                if (frontend.length > 0) u.setPartial(p => ({ ...p, frontend }));
                if (database.length > 0) u.setPartial(p => ({ ...p, database }));
                resolve({ done: true, result: { backend, frontend, database } }); return;
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
  const partialResultRef = useRef<Partial<GenerationResult>>({});

  const updateStep = useCallback((stepNum: number, patch: Partial<PipelineStep>) => {
    setSteps(prev => prev.map(s => s.step === stepNum ? { ...s, ...patch } : s));
  }, []);

  const appendToken = useCallback((stepNum: number, text: string) => {
    setStepTokens(prev => ({ ...prev, [stepNum]: (prev[stepNum] ?? "") + text }));
  }, []);

  // Keeps partialResultRef in sync so run() fallback can read the latest value synchronously
  const setPartialResultSynced = useCallback((updater: (prev: Partial<GenerationResult>) => Partial<GenerationResult>) => {
    setPartialResult(prev => {
      const next = updater(prev);
      partialResultRef.current = next;
      return next;
    });
  }, []);

  const run = useCallback(async (userPrompt: string) => {
    const hasActiveData = steps.some(s => s.status !== "idle") || result || Object.keys(stepTokens).length > 0 || chatMessage;
    if (hasActiveData && prompt) {
      setHistory(prev => [...prev, { prompt, steps, stepTokens, result, partialResult, chatMessage, error }]);
    }

    setSteps(buildInitialSteps());
    setResult(null);
    setPartialResult({});
    partialResultRef.current = {};
    setChatMessage(null);
    setError(null);
    setStepTokens({});
    setClarificationQuestion(null);
    setPrompt(userPrompt);
    setRunning(true);

    let localPartial: Partial<GenerationResult> = {};
    let localResult: GenerationResult | null = null;

    const u: LocalUpdater = {
      updateStep: (stepNum, patch) => updateStep(stepNum, patch),
      appendToken: (stepNum, text) => appendToken(stepNum, text),
      setPartial: (updater) => {
        localPartial = updater(localPartial);
        setPartialResultSynced(updater);
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
          setChatMessage(r.chat);
          // immediately archive this greeting turn into history
          setHistory(prev => [...prev, { prompt: userPrompt, steps: buildInitialSteps(), stepTokens: {}, result: null, partialResult: {}, chatMessage: r.chat!, error: null }]);
          setChatMessage(null);
          setPrompt("");
          break;
        }
        if (r.waitingForAnswer) { setPaused(true); setRunning(false); return; }
        if (r.done && r.result) { localResult = r.result; setResult(r.result); break; }
      }

      // Fallback 1: use synchronously-tracked localPartial
      if (!localResult && (localPartial.backend?.length || localPartial.frontend?.length || localPartial.database?.length)) {
        localResult = {
          backend:  localPartial.backend  ?? [],
          frontend: localPartial.frontend ?? [],
          database: localPartial.database ?? [],
        };
        setResult(localResult);
      }

      // Fallback 2: read from ref (catches React async batching edge cases)
      if (!localResult) {
        const latest = partialResultRef.current;
        if (latest.backend?.length || latest.frontend?.length || latest.database?.length) {
          setResult({
            backend:  latest.backend  ?? [],
            frontend: latest.frontend ?? [],
            database: latest.database ?? [],
          });
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }

    setRunning(false);
  }, [updateStep, appendToken, setPartialResultSynced, steps, result, stepTokens, prompt, partialResult, chatMessage, error]);

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
              if (payload.status === "completed") {
                const files = payload.data?.fileList || payload.data?.files;
                if (Array.isArray(files) && files.length > 0) {
                  if (payload.label === "Backend Generation")  setPartialResultSynced(prev => ({ ...prev, backend: files }));
                  if (payload.label === "Frontend Generation") setPartialResultSynced(prev => ({ ...prev, frontend: files }));
                  if (payload.label === "Database Generation") setPartialResultSynced(prev => ({ ...prev, database: files }));
                }
              }
            } else if (lastEvent === "token") {
              appendToken(payload.step, payload.text);
            } else if (lastEvent === "clarification-question") {
              setClarificationQuestion({ ...payload.question, index: payload.index, total: payload.total });
            } else if (lastEvent === "done") {
              const backend  = Array.isArray(payload?.backend)  ? payload.backend  : [];
              const frontend = Array.isArray(payload?.frontend) ? payload.frontend : [];
              const database = Array.isArray(payload?.database) ? payload.database : [];
              if (backend.length > 0)  setPartialResultSynced(prev => ({ ...prev, backend }));
              if (frontend.length > 0) setPartialResultSynced(prev => ({ ...prev, frontend }));
              if (database.length > 0) setPartialResultSynced(prev => ({ ...prev, database }));
              setResult({ backend, frontend, database });
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
  }, [updateStep, appendToken, setPartialResultSynced]);

  const completedSteps = steps.filter(s => s.status === "completed").length;
  const progress = Math.round((completedSteps / STEPS.length) * 100);

  return { steps, result, partialResult, partialResultRef, chatMessage, running, paused, error, progress, stepTokens, prompt, clarificationQuestion, history, run, answerQuestion };
}
