import { useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { usePipeline } from "./hooks/usePipeline";
import { Sidebar } from "./components/Sidebar";
import { LandingView } from "./components/LandingView";
import { CodeView } from "./components/CodeView";
import { PipelineView } from "./components/PipelineView";
import type{ GenerationResult } from "./type/types";

export default function Landing() {
  const {
    steps, result, partialResult, chatMessage, running, paused, error,
    stepTokens, prompt, clarificationQuestion, history, run, answerQuestion,
  } = usePipeline();

  const location = useLocation();
  const mode: "banking" | "insurance" =
    (location.state as any)?.mode === "insurance" || location.pathname === "/insurvibe-code-builder"
      ? "insurance"
      : "banking";

  const hasEverStartedRef = useRef(false);
  if (running || history.length > 0 || steps.some(s => s.status !== "idle")) {
    hasEverStartedRef.current = true;
  }
  const hasStarted = hasEverStartedRef.current;

  const [codeViewResult, setCodeViewResult] = useState<GenerationResult | null>(null);
  const [codeViewTab, setCodeViewTab] = useState<"backend" | "frontend" | "database" | undefined>(undefined);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  const handleViewCode = (result: GenerationResult, tab?: "backend" | "frontend" | "database") => {
    const hasFiles = result.backend.length > 0 || result.frontend.length > 0 || result.database.length > 0;
    if (!hasFiles) return;
    setCodeViewResult(result);
    setCodeViewTab(tab);
  };

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{ background: "#F8F9FC", fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif" }}
    >
     

      <Sidebar running={running} result={result} codeViewResult={codeViewResult} selectedBank={selectedBank} onSelectBank={setSelectedBank} mode={mode} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {codeViewResult ? (
          <CodeView result={codeViewResult} defaultTab={codeViewTab} onBack={() => { setCodeViewResult(null); setCodeViewTab(undefined); }} />
        ) : !hasStarted ? (
          <LandingView
            running={running}
            onRun={run}
            selectedBank={selectedBank}
            mode={mode}
          />
        ) : (
          <PipelineView
            steps={steps}
            stepTokens={stepTokens}
            result={result}
            partialResult={partialResult}
            running={running}
            paused={paused}
            error={error}
            chatMessage={chatMessage}
            prompt={prompt}
            history={history}
            clarificationQuestion={clarificationQuestion}
            onRun={run}
            onAnswer={answerQuestion}
            onViewCode={handleViewCode}
          />
        )}
      </main>
    </div>
  );
}