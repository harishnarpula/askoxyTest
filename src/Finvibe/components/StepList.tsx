import { useEffect, useRef } from "react";
import type { PipelineStep } from "../type/types";
import type { StepTokensMap } from "../hooks/usePipeline";

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
  "Backend Prompt":      { icon: "🖊️", summary: d => d?.length ? `${d.length} chars` : "Done" },
  "Frontend Prompt":     { icon: "🖌️", summary: d => d?.length ? `${d.length} chars` : "Done" },
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
    <div className="flex flex-col gap-1.5">
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
            className="rounded-xl border transition-all duration-300 overflow-hidden"
            style={{
              background: isActive
                ? "#EFF6FF"
                : isDone
                ? "#F0FDF4"
                : isError
                ? "#FEF2F2"
                : "transparent",
              border: isActive
                ? "1px solid #BFDBFE"
                : isDone
                ? "1px solid #BBF7D0"
                : isError
                ? "1px solid #FECACA"
                : "1px solid transparent",
            }}
          >
            {/* Header row */}
            <div
              className={`flex items-center gap-2.5 px-3.5 py-2.5 ${isIdle ? "opacity-30" : ""}`}
            >
              {/* Status indicator */}
              <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                {isActive ? (
                  <span
                    className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin block"
                    style={{ borderColor: "#3B6FFF", borderTopColor: "transparent" }}
                  />
                ) : isDone ? (
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: "#22C55E" }}
                  >
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path
                        d="M1 3.5L3.5 6L8 1"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                ) : isError ? (
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px]"
                    style={{ background: "#EF4444" }}
                  >
                    ✗
                  </span>
                ) : (
                  <span
                    className="w-4 h-4 rounded-full block"
                    style={{ border: "1.5px solid #D1D9E8" }}
                  />
                )}
              </div>

              <span className="text-sm leading-none">{icon}</span>

              <div className="flex-1 min-w-0">
                <span
                  className="text-[12px] font-semibold leading-none"
                  style={{
                    color: isActive
                      ? "#1D4ED8"
                      : isDone
                      ? "#166534"
                      : isError
                      ? "#DC2626"
                      : "#9CAABE",
                  }}
                >
                  {baseLabel}
                </span>
                {isDone && meta && (
                  <div
                    className="text-[10px] mt-0.5 truncate font-medium"
                    style={{ color: "#22C55E" }}
                  >
                    {meta.summary(step.data)}
                  </div>
                )}
              </div>

              {isActive && (
                <span
                  className="text-[10px] font-bold uppercase tracking-widest shrink-0 animate-pulse"
                  style={{ color: "#3B6FFF" }}
                >
                  live
                </span>
              )}
            </div>

            {/* Live token stream */}
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

  const display = tokens.length > 400 ? "…" + tokens.slice(-400) : tokens;

  return (
    <div
      ref={ref}
      className="mx-3.5 mb-3.5 px-3 py-2.5 rounded-xl max-h-28 overflow-hidden"
      style={{
        background: "#F0F4FF",
        border: "1px solid #DBEAFE",
      }}
    >
      <pre
        className="text-[10px] font-mono whitespace-pre-wrap break-all leading-4"
        style={{ color: "#4B6EAF" }}
      >
        {display || " "}
        <span
          className="inline-block w-1.5 h-3 animate-pulse rounded-sm align-middle ml-0.5"
          style={{ background: "#3B6FFF" }}
        />
      </pre>
    </div>
  );
}