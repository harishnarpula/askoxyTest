import { useEffect, useRef, useState } from "react";
import type{ PipelineStep, GenerationResult, CodeFile } from "../type/types";
import type { StepTokensMap, ConversationTurn } from "../hooks/usePipeline";

type CodeTab = "backend" | "frontend" | "database";

interface Props {
  steps: PipelineStep[];
  stepTokens: StepTokensMap;
  result: GenerationResult | null;
  partialResult: Partial<GenerationResult>;
  running: boolean;
  paused: boolean;
  error: string | null;
  chatMessage: string | null;
  prompt: string;
  hasPendingClarification: boolean;
  history: ConversationTurn[];
  onViewCode: (result: GenerationResult, tab?: CodeTab) => void;
}

const STEP_META: Record<string, { icon: string; accent: string; summary: (data: any) => string }> = {
  "Planning":            { icon: "🔍", accent: "#3B82F6", summary: d => d?.domain ? `${d.domain}  ·  ${(d.actors || []).join(", ")}` : "Complete" },
  "Clarification":       { icon: "❓", accent: "#F59E0B", summary: d => d?.questions ? `${d.questions} questions sent` : "Skipped" },
  "Tech Stack":          { icon: "🛠️", accent: "#8B5CF6", summary: d => d ? `${d.backend}  ·  ${d.frontend}  ·  ${d.database}` : "Complete" },
  "Use Cases":           { icon: "📋", accent: "#06B6D4", summary: d => d?.count ? `${d.count} use cases identified` : "Complete" },
  "Compliance":          { icon: "📜", accent: "#F59E0B", summary: d => d?.count ? `${d.count} compliance rules applied` : "Skipped (non-NBFC)" },
  "System Design":       { icon: "🏗️", accent: "#F97316", summary: d => d?.apis ? `${d.modules} modules  ·  ${d.apis} APIs designed` : "Complete" },
  "Folder Structure":    { icon: "📁", accent: "#14B8A6", summary: d => d?.count ? `${d.count} entries scaffolded` : "Complete" },
  "Prompt Builder":      { icon: "✍️", accent: "#EC4899", summary: d => d?.length ? `${d.length.toLocaleString()} char prompt built` : "Complete" },
  "Backend Prompt":      { icon: "🖊️", accent: "#F97316", summary: d => d?.length ? `${d.length.toLocaleString()} char prompt built` : "Complete" },
  "Frontend Prompt":     { icon: "🖌️", accent: "#8B5CF6", summary: d => d?.length ? `${d.length.toLocaleString()} char prompt built` : "Complete" },
  "Backend Generation":  { icon: "⚙️", accent: "#10B981", summary: d => d?.files ? `${d.files} backend files generated` : "Complete" },
  "Frontend Generation": { icon: "🎨", accent: "#A78BFA", summary: d => d?.files ? `${d.files} frontend files generated` : "Complete" },
  "Database Generation": { icon: "🗄️", accent: "#38BDF8", summary: d => d?.files ? `${d.files} database files generated` : "Complete" },
  "Validation":          { icon: "🔬", accent: "#10B981", summary: d => d?.status === "PASS" ? "All checks passed ✓" : d?.issues?.length ? `${d.issues.length} issues resolved` : "Complete" },
};

const CODE_STEPS = new Set(["Backend Generation", "Frontend Generation", "Database Generation"]);

// ── Collapsed output viewer ───────────────────────────────────────────────────

function CollapsedTokenView({ tokens, accent }: { tokens: string; accent: string }) {
  return (
    <div className="mx-3.5 mb-3.5 rounded-xl overflow-hidden"
      style={{ background: "#EEF2FF", border: `1px solid ${accent}30` }}>
      <div className="flex items-center gap-1.5 px-3 py-1.5"
        style={{ background: "#E4E9FF", borderBottom: `1px solid ${accent}20` }}>
        <span className="w-2 h-2 rounded-full" style={{ background: accent + "75" }} />
        <span className="w-2 h-2 rounded-full" style={{ background: accent + "40" }} />
        <span className="w-2 h-2 rounded-full" style={{ background: accent + "1E" }} />
        <span className="text-[10px] font-mono ml-2 font-medium" style={{ color: accent }}>step output</span>
      </div>
      <pre className="px-3 py-3 text-[11px] font-mono whitespace-pre-wrap break-all leading-relaxed max-h-96 overflow-y-auto"
        style={{ color: "#3B4A6B", scrollbarWidth: "thin" }}>
        {tokens}
      </pre>
    </div>
  );
}

// ── Live token stream ─────────────────────────────────────────────────────────

function TokenStream({ tokens, accent }: { tokens: string; accent: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [tokens]);
  return (
    <div ref={ref} className="mx-3.5 mb-3.5 rounded-xl max-h-36 overflow-y-auto"
      style={{ background: "#EEF2FF", border: `1px solid ${accent}30`, scrollbarWidth: "none" }}>
      <div className="flex items-center gap-1.5 px-3 py-1.5 sticky top-0"
        style={{ background: "#E4E9FF", borderBottom: `1px solid ${accent}20`, backdropFilter: "blur(4px)" }}>
        <span className="w-2 h-2 rounded-full" style={{ background: accent + "80" }} />
        <span className="w-2 h-2 rounded-full" style={{ background: accent + "42" }} />
        <span className="w-2 h-2 rounded-full" style={{ background: accent + "1E" }} />
        <span className="text-[10px] font-mono ml-2 font-medium" style={{ color: accent }}>live output</span>
        <div className="ml-auto w-12 h-0.5 rounded-full overflow-hidden" style={{ background: "#D1D9F0" }}>
          <div className="h-full rounded-full animate-pulse" style={{ width: "60%", background: `linear-gradient(90deg, ${accent}30, ${accent})` }} />
        </div>
      </div>
      <pre className="px-3 py-3 text-[11px] font-mono whitespace-pre-wrap break-all leading-[1.75]"
        style={{ color: "#3B4A6B" }}>
        {tokens || " "}
        <span className="inline-block w-1.5 h-[13px] rounded-sm align-middle ml-0.5 animate-pulse" style={{ background: accent }} />
      </pre>
    </div>
  );
}

// ── Single step card ──────────────────────────────────────────────────────────

function StepCard({
  step, idx, isLastStep, tokens, isLiveRun, expandedSteps, toggleStep, partialResult, result, onViewCode,
}: {
  step: PipelineStep;
  idx: number;
  isLastStep: boolean;
  tokens: string;
  isLiveRun: boolean;
  expandedSteps: Set<number>;
  toggleStep: (i: number) => void;
  partialResult?: Partial<GenerationResult>;
  result?: GenerationResult | null;
  onViewCode: (r: GenerationResult, tab?: CodeTab) => void;
}) {
  const isActive = step.status === "streaming";
  const isDone   = step.status === "completed";
  const isError  = step.status === "error";
  const baseLabel = step.label.split(" (")[0];
  const meta = STEP_META[baseLabel];
  const accent = meta?.accent ?? "#3B82F6";
  const isExpanded = expandedSteps.has(idx);
  const isCodeStep = CODE_STEPS.has(baseLabel);

  const getTabForStep = (): CodeTab => {
    if (baseLabel === "Frontend Generation") return "frontend";
    if (baseLabel === "Database Generation") return "database";
    return "backend";
  };

  // Only this step's files — read from step.data.fileList first (always in sync),
  // then fall back to partialResult/result
  const getThisStepFiles = (): CodeFile[] => {
    const tab = getTabForStep();
    const fromStepData = (step.data as any)?.fileList;
    if (Array.isArray(fromStepData) && fromStepData.length > 0) return fromStepData;
    if (partialResult?.[tab]?.length) return partialResult[tab]!;
    if (result?.[tab]?.length) return result[tab];
    return [];
  };

  // Build full result for CodeView — all accumulated files so far
  const buildViewResult = (): GenerationResult => {
    const getFiles = (tab: "backend" | "frontend" | "database"): CodeFile[] => {
      const fromStepData = tab === getTabForStep() ? (step.data as any)?.fileList : undefined;
      if (Array.isArray(fromStepData) && fromStepData.length > 0) return fromStepData;
      if (partialResult?.[tab]?.length) return partialResult[tab]!;
      if (result?.[tab]?.length) return result[tab];
      return [];
    };
    return {
      backend:  getFiles("backend"),
      frontend: getFiles("frontend"),
      database: getFiles("database"),
    };
  };

  return (
    <div className="flex gap-3 items-stretch">
      {/* Timeline dot */}
      <div className="flex flex-col items-center w-7 shrink-0">
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-500"
          style={{
            background: isActive ? `${accent}1E` : isDone ? `${accent}14` : "#F0F2F8",
            border: isActive ? `2px solid ${accent}58` : isDone ? `1px solid ${accent}32` : "1px solid #D8DCE8",
            boxShadow: isActive ? `0 0 14px ${accent}2A` : "none",
          }}>
          {isActive ? (
            <span className="w-3 h-3 rounded-full border-[2px] border-t-transparent animate-spin block"
              style={{ borderColor: accent, borderTopColor: "transparent" }} />
          ) : isDone ? (
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path d="M1 3.5L3.5 6L8 1" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <span style={{ fontSize: 12 }}>{meta?.icon ?? "▸"}</span>
          )}
        </div>
        {!isLastStep && (
          <div className="w-px flex-1 mt-1.5"
            style={{ background: isDone ? `linear-gradient(to bottom, ${accent}2A, #E8ECF4)` : "#E8ECF4", minHeight: 14 }} />
        )}
      </div>

      {/* Card */}
      <div className="flex-1 rounded-2xl overflow-hidden mb-1.5 transition-all duration-500"
        style={{
          background: isActive ? `${accent}0F` : isDone ? "#FAFBFF" : "transparent",
          border: isActive ? `1px solid ${accent}40` : isDone ? "1px solid #E8ECF4" : isError ? "1px solid rgba(239,68,68,0.3)" : "1px solid transparent",
          boxShadow: isActive ? `0 0 28px ${accent}0C` : "none",
        }}>
        {/* Header */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5">
          <span style={{ fontSize: 14 }}>{meta?.icon ?? "▸"}</span>
          <span className="text-[12px] font-semibold"
            style={{ color: isActive ? "#0A0E1A" : isDone ? "#1A2035" : "#9CAABE" }}>
            {baseLabel}
          </span>

          {isActive && (
            <div className="ml-auto flex items-center gap-2">
              <span className="flex gap-0.5">
                {[0,1,2].map(i => <span key={i} className="w-1 h-1 rounded-full animate-bounce"
                  style={{ background: accent, animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }} />)}
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${accent}18`, color: accent }}>streaming</span>
            </div>
          )}

          {isDone && (
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: `${accent}18`, color: accent }}>Done</span>

              {tokens && (
                <button onClick={() => toggleStep(idx)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all"
                  style={{ background: "#F0F2F8", color: "#6B7A99", border: "1px solid #D8DCE8" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#E4E8F4"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#F0F2F8"}>
                  {isExpanded ? "▲ Hide" : "▼ View output"}
                </button>
              )}

              {isCodeStep && getThisStepFiles().length > 0 && (
                <button
                  onClick={() => onViewCode(buildViewResult(), getTabForStep())}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-all text-white"
                  style={{ background: `linear-gradient(135deg, ${accent}AA, ${accent})`, boxShadow: `0 0 10px ${accent}30` }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.85"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}>
                  View Code →
                </button>
              )}
            </div>
          )}

          {isError && (
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-500">Error</span>
          )}
        </div>

        {/* Summary */}
        {isDone && meta && (
          <div className="px-3.5 pb-2.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: `${accent}65` }} />
            <span className="text-[11px]" style={{ color: "#6B7A99" }}>{meta.summary(step.data)}</span>
          </div>
        )}

        {isDone && isExpanded && tokens && <CollapsedTokenView tokens={tokens} accent={accent} />}
        {isActive && <TokenStream tokens={tokens} accent={accent} />}
      </div>
    </div>
  );
}

// ── Single conversation turn ───────────────────────────────────────────────────

function ConversationTurnView({ turn, onViewCode }: { turn: ConversationTurn; onViewCode: (r: GenerationResult, tab?: CodeTab) => void }) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const visibleSteps: PipelineStep[] = turn.chatMessage ? [] : turn.steps.filter((s: PipelineStep) => s.status !== "idle");

  const toggleStep = (idx: number) =>
    setExpandedSteps(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });

  const completedLabels = new Set(
    turn.steps.filter((s: PipelineStep) => s.status === "completed").map((s: PipelineStep) => s.label.split(" (")[0])
  );
  const backendDone  = completedLabels.has("Backend Generation");
  const frontendDone = completedLabels.has("Frontend Generation");
  const databaseDone = completedLabels.has("Database Generation");

  const displayResult: GenerationResult | null = turn.result ?? (() => {
    const getStepFiles = (label: string) => {
      const s = turn.steps.find(st => st.label.split(" (")[0] === label);
      const fromData = (s?.data as any)?.fileList;
      return Array.isArray(fromData) && fromData.length > 0 ? fromData : [];
    };
    const b = backendDone  ? (turn.partialResult.backend?.length  ? turn.partialResult.backend  : getStepFiles("Backend Generation"))  : [];
    const f = frontendDone ? (turn.partialResult.frontend?.length ? turn.partialResult.frontend : getStepFiles("Frontend Generation")) : [];
    const d = databaseDone ? (turn.partialResult.database?.length ? turn.partialResult.database : getStepFiles("Database Generation")) : [];
    return (b.length || f.length || d.length) ? { backend: b, frontend: f, database: d } : null;
  })();

  const totalFiles = displayResult ? displayResult.backend.length + displayResult.frontend.length + displayResult.database.length : 0;

  return (
    <div className="flex flex-col gap-2">
      {turn.prompt && (
        <div className="flex justify-end mb-1">
          <div className="max-w-[78%] px-4 py-2.5 rounded-2xl text-sm"
            style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.26)", color: "#1A1F4B" }}>
            {turn.prompt}
          </div>
        </div>
      )}

      {turn.chatMessage && (
        <div className="px-4 py-3 rounded-2xl text-sm"
          style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.22)", color: "#1D4ED8" }}>
          💬 {turn.chatMessage}
        </div>
      )}

      {turn.error && (
        <div className="px-4 py-3 rounded-2xl text-sm font-medium"
          style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", color: "#DC2626" }}>
          ❌ {turn.error}
        </div>
      )}

      {visibleSteps.map((step: PipelineStep, idx: number) => (
        <StepCard key={step.step} step={step} idx={idx}
          isLastStep={idx === visibleSteps.length - 1}
          tokens={turn.stepTokens[step.step] ?? ""}
          isLiveRun={false}
          expandedSteps={expandedSteps} toggleStep={toggleStep}
          partialResult={turn.partialResult}
          result={turn.result}
          onViewCode={onViewCode} />
      ))}

      {displayResult && (
        <div className="mt-1">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-200"
            style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)" }}
            onClick={() => onViewCode(displayResult)}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.1)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(16,185,129,0.32)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.06)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(16,185,129,0.18)"; }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(16,185,129,0.14)", border: "1px solid rgba(16,185,129,0.22)" }}>
              <span className="text-base">📦</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: "#0A0E1A" }}>Generated Files</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: "#E8ECF4", color: "#6B7A99" }}>
                  {totalFiles} files
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                {displayResult.backend.length  > 0 && <span className="text-[11px]" style={{ color: "#6B7A99" }}>⚙️ {displayResult.backend.length} backend</span>}
                {displayResult.frontend.length > 0 && <span className="text-[11px]" style={{ color: "#6B7A99" }}>🎨 {displayResult.frontend.length} frontend</span>}
                {displayResult.database.length > 0 && <span className="text-[11px]" style={{ color: "#6B7A99" }}>🗄️ {displayResult.database.length} database</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span className="text-xs font-semibold text-emerald-600">Complete</span>
              <div className="ml-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5"
                style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
                View Code
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5h6M5 2l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── In-progress live turn ─────────────────────────────────────────────────────

function LiveTurnView({ steps, stepTokens, partialResult, result, prompt, onViewCode }: {
  steps: PipelineStep[];
  stepTokens: StepTokensMap;
  partialResult: Partial<GenerationResult>;
  result: GenerationResult | null;
  prompt: string;
  onViewCode: (r: GenerationResult, tab?: CodeTab) => void;
}) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const visibleSteps = steps.filter(s => s.status !== "idle");
  const toggleStep = (idx: number) =>
    setExpandedSteps(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });

  return (
    <div className="flex flex-col gap-2">
      {prompt && (
        <div className="flex justify-end mb-1">
          <div className="max-w-[78%] px-4 py-2.5 rounded-2xl text-sm"
            style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.26)", color: "#1A1F4B" }}>
            {prompt}
          </div>
        </div>
      )}

      {visibleSteps.map((step, idx) => (
        <StepCard key={step.step} step={step} idx={idx}
          isLastStep={idx === visibleSteps.length - 1}
          tokens={stepTokens[step.step] ?? ""}
          isLiveRun={true}
          expandedSteps={expandedSteps} toggleStep={toggleStep}
          partialResult={partialResult}
          result={result}
          onViewCode={onViewCode} />
      ))}

      {(() => {
        const doneLabels = new Set(steps.filter(s => s.status === "completed").map(s => s.label.split(" (")[0]));
        const completedFiles =
          (doneLabels.has("Backend Generation")  ? (partialResult.backend?.length  ?? 0) : 0) +
          (doneLabels.has("Frontend Generation") ? (partialResult.frontend?.length ?? 0) : 0) +
          (doneLabels.has("Database Generation") ? (partialResult.database?.length ?? 0) : 0);
        const activeStep = steps.find(s => s.status === "streaming");
        const isGenerating = activeStep && ["Backend Generation", "Frontend Generation", "Database Generation"].includes(activeStep.label.split(" (")[0]);
        if (!isGenerating && completedFiles === 0) return null;

        const liveViewResult: GenerationResult = {
          backend:  partialResult.backend  ?? [],
          frontend: partialResult.frontend ?? [],
          database: partialResult.database ?? [],
        };

        return (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl mt-0.5"
            style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.22)" }}>
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shrink-0" />
            <span className="text-xs text-blue-600 font-medium flex-1">
              {isGenerating ? `Generating ${activeStep!.label.split(" (")[0].replace(" Generation", "")}…` : "Generating…"}
              {completedFiles > 0 ? ` · ${completedFiles} files done` : ""}
            </span>
          </div>
        );
      })()}
    </div>
  );
}

// ── Main PipelineFeed ─────────────────────────────────────────────────────────

export function PipelineFeed({ steps, stepTokens, result, partialResult, running, paused, error, chatMessage, prompt, hasPendingClarification, history, onViewCode }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history.length, running, steps.filter(s => s.status !== "idle").length]);

  return (
    <div className="h-full overflow-y-auto" style={{ background: "#F8F9FC", scrollbarWidth: "none" }}>
      <div className="max-w-2xl mx-auto px-5 py-5 flex flex-col gap-5">

        {history.map((turn, i) => (
          <ConversationTurnView key={i} turn={turn} onViewCode={onViewCode} />
        ))}

        {(running || paused) && (
          <LiveTurnView
            steps={steps} stepTokens={stepTokens}
            partialResult={partialResult} result={result} prompt={prompt}
            onViewCode={onViewCode} />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
