import { useEffect, useRef, useState } from "react";
import { PipelineFeed } from "./PipelineFeed";
import { PromptInput } from "./PromptInput";
import type { GenerationResult, PipelineStep } from "../type/types";
import type { StepTokensMap, ClarificationQuestion, ConversationTurn } from "../hooks/usePipeline";

interface PipelineViewProps {
  steps: PipelineStep[];
  stepTokens: StepTokensMap;
  result: GenerationResult | null;
  partialResult: Partial<GenerationResult>;
  running: boolean;
  paused: boolean;
  error: string | null;
  chatMessage: string | null;
  prompt: string;
  history: ConversationTurn[];
  clarificationQuestion:
    | (ClarificationQuestion & { index: number; total: number })
    | null;
  onRun: (prompt: string) => void;
  onAnswer: (answer: string) => void;
  onViewCode: (result: GenerationResult, tab?: "backend" | "frontend" | "database") => void;
}

export function PipelineView({
  steps,
  stepTokens,
  result,
  partialResult,
  running,
  paused,
  error,
  chatMessage,
  prompt,
  history,
  clarificationQuestion,
  onRun,
  onAnswer,
  onViewCode,
}: PipelineViewProps) {
  const [answerText, setAnswerText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input and clear value whenever a new question appears
  useEffect(() => {
    if (clarificationQuestion) {
      setAnswerText("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [clarificationQuestion?.index]);

  const submitAnswer = () => {
    const val = answerText.trim();
    if (!val) return;
    setAnswerText("");
    onAnswer(val);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* ── Feed ── */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <PipelineFeed
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
          hasPendingClarification={!!clarificationQuestion}
          onViewCode={onViewCode}
        />
      </div>

      {/* ── Clarification panel — only when needed ── */}
      {clarificationQuestion && (
        <div
          style={{
            flexShrink: 0,
            borderTop: "1px solid #EAECF2",
            background: "#FFFFFF",
            padding: "16px 24px 14px",
          }}
        >
          <div style={{ maxWidth: "640px", margin: "0 auto" }}>
            {/* Progress indicator */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "10px",
              }}
            >
              <span
                style={{
                  fontSize: "9.5px",
                  fontWeight: 700,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: "#D97706",
                  background: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.3)",
                  padding: "2px 8px",
                  borderRadius: "20px",
                }}
              >
                ❓ Question {clarificationQuestion.index + 1} /{" "}
                {clarificationQuestion.total}
              </span>
              <div style={{ display: "flex", gap: "4px" }}>
                {Array.from({ length: clarificationQuestion.total }).map(
                  (_, i) => (
                    <span
                      key={i}
                      style={{
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        background:
                          i <= clarificationQuestion.index
                            ? "#F59E0B"
                            : "#D1D9E8",
                        transition: "background .2s",
                      }}
                    />
                  ),
                )}
              </div>
            </div>

            {/* Question text */}
            <p
              style={{
                fontSize: "13px",
                lineHeight: 1.6,
                color: "#1A1F4B",
                margin: "0 0 12px",
                fontWeight: 500,
              }}
            >
              {clarificationQuestion.question}
            </p>

            {/* Option buttons or text input */}
            {clarificationQuestion.options &&
            clarificationQuestion.options.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                {clarificationQuestion.options.map((opt: string) => (
                  <button
                    key={opt}
                    onClick={() => onAnswer(opt)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: 600,
                      background: "rgba(245,158,11,0.08)",
                      border: "1px solid rgba(245,158,11,0.28)",
                      color: "#D97706",
                      cursor: "pointer",
                      transition: "all .15s",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "rgba(245,158,11,0.18)";
                      el.style.borderColor = "rgba(245,158,11,0.5)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "rgba(245,158,11,0.08)";
                      el.style.borderColor = "rgba(245,158,11,0.28)";
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Type your answer…"
                  style={{
                    flex: 1,
                    padding: "8px 14px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    outline: "none",
                    background: "#F8F9FC",
                    border: "1px solid #D8DCE8",
                    color: "#0D1117",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitAnswer();
                  }}
                />
                <button
                  onClick={submitAnswer}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "10px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#fff",
                    background: "linear-gradient(135deg, #F59E0B, #D97706)",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 10px rgba(245,158,11,.3)",
                  }}
                >
                  Send
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Bottom prompt bar ── */}
      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid #EAECF2",
          background: "#FFFFFF",
          padding: "10px 20px 12px",
        }}
      >
        <div
          style={{
            maxWidth: "760px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {/* FINVIBE logo mark */}
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #3B82F6, #6366F1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: 900,
              color: "#fff",
              flexShrink: 0,
              letterSpacing: "-0.02em",
            }}
          >
            F
          </div>

          {/* Prompt input */}
          <div style={{ flex: 1 }}>
            <PromptInput onSubmit={onRun} disabled={running} compact />
          </div>

          {/* Status pill */}
          {running && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 12px",
                borderRadius: "20px",
                flexShrink: 0,
                background: "rgba(59,130,246,0.1)",
                border: "1px solid rgba(59,130,246,0.22)",
              }}
            >
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  background: "#3B82F6",
                  animation: "pv-pulse 1.2s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#2563EB",
                  whiteSpace: "nowrap",
                }}
              >
                Building…
              </span>
            </div>
          )}
          {result && !running && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 12px",
                borderRadius: "20px",
                flexShrink: 0,
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.22)",
              }}
            >
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  background: "#10B981",
                }}
              />
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#059669",
                  whiteSpace: "nowrap",
                }}
              >
                Done
              </span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pv-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>
    </div>
  );
}
