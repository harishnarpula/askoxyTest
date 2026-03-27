import { useEffect, useRef } from "react";
import { PipelineStep } from "../types";
import { StepTokensMap } from "../hooks/usePipeline";

interface Props {
  steps: PipelineStep[];
  stepTokens: StepTokensMap;
}

const STEP_META: Record<string, { icon: string; summary: (data: any) => string }> = {
  "Planning":            { icon: "🔍", summary: d => d?.domain ? `${d.domain} · ${(d.actors || []).join(", ")}` : "Done" },
  "Tech Stack":          { icon: "🛠️", summary: d => d ? `${d.backend} · ${d.frontend} · ${d.database}` : "Done" },
  "Use Cases":           { icon: "📋", summary: d => d?.count ? `${d.count} use cases` : "Done" },
  "Compliance":          { icon: "📜", summary: d => d?.count ? `${d.count} rules` : "Done" },
  "System Design":       { icon: "🏗️", summary: d => d?.apis ? `${d.modules} modules · ${d.apis} APIs` : "Done" },
  "Folder Structure":    { icon: "📁", summary: d => d?.count ? `${d.count} entries` : "Done" },
  "Prompt Builder":      { icon: "✍️", summary: d => d?.length ? `${d.length} chars` : "Done" },
  "Backend Generation":  { icon: "⚙️", summary: d => d?.files ? `${d.files} files` : "Done" },
  "Frontend Generation": { icon: "🎨", summary: d => d?.files ? `${d.files} files` : "Done" },
  "Database Generation": { icon: "🗄️", summary: d => d?.files ? `${d.files} files` : "Done" },
  "Validation":          { icon: "🔬", summary: d => d?.status ? `${d.status} · ${d.issues?.length ?? 0} issues` : "Done" },
};

export function StepList({ steps, stepTokens }: Props) {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [steps]);

  return (
    <div className="flex flex-col gap-1">
      {steps.map((step) => {
        const isActive = step.status === "streaming";
        const isDone = step.status === "completed";
        const isError = step.status === "error";
        const isIdle = step.status === "idle";

        const baseLabel = step.label.split(" (")[0];
        const meta = STEP_META[baseLabel];
        const icon = meta?.icon ?? "▸";
        const tokens = stepTokens[step.step] ?? "";

        return (
          <div
            key={step.step}
            ref={isActive ? activeRef : undefined}
            className={`rounded-xl border transition-all duration-300 overflow-hidden ${
              isActive  ? "border-blue-500/30 bg-blue-500/5" :
              isDone    ? "border-green-500/20 bg-green-500/5" :
              isError   ? "border-red-500/20 bg-red-500/5" :
                          "border-transparent bg-transparent"
            }`}
          >
            {/* Header row */}
            <div className={`flex items-center gap-2.5 px-3 py-2.5 ${isIdle ? "opacity-30" : ""}`}>
              {/* Status dot / spinner / check */}
              <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                {isActive ? (
                  <span className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin block" />
                ) : isDone ? (
                  <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                ) : isError ? (
                  <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-[9px]">✗</span>
                ) : (
                  <span className="w-4 h-4 rounded-full border border-gray-700 block" />
                )}
              </div>

              <span className="text-base leading-none">{icon}</span>

              <div className="flex-1 min-w-0">
                <span className={`text-xs font-medium leading-none ${
                  isActive ? "text-white" : isDone ? "text-gray-300" : isError ? "text-red-400" : "text-gray-600"
                }`}>
                  {baseLabel}
                </span>
                {/* Completed summary */}
                {isDone && meta && (
                  <div className="text-[10px] text-green-400/80 mt-0.5 truncate">
                    {meta.summary(step.data)}
                  </div>
                )}
              </div>

              {isActive && (
                <span className="text-[10px] text-blue-400 font-mono shrink-0 animate-pulse">live</span>
              )}
            </div>

            {/* Live token stream — only shown while active */}
            {isActive && (
              <TokenStream tokens={tokens} stepNum={step.step} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TokenStream({ tokens }: { tokens: string; stepNum: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [tokens]);

  // Show last ~400 chars so it doesn't get too long
  const display = tokens.length > 400 ? "…" + tokens.slice(-400) : tokens;

  return (
    <div
      ref={ref}
      className="mx-3 mb-3 px-3 py-2 bg-gray-900/80 rounded-lg border border-gray-800 max-h-28 overflow-hidden"
    >
      <pre className="text-[10px] font-mono text-gray-400 whitespace-pre-wrap break-all leading-4">
        {display || " "}
        <span className="inline-block w-1.5 h-3 bg-blue-400 animate-pulse rounded-sm align-middle ml-0.5" />
      </pre>
    </div>
  );
}
