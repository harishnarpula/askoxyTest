import { FileExplorer } from "./FileExplorer";
import type { GenerationResult } from "../type/types";

interface CodeViewProps {
  result: GenerationResult;
  defaultTab?: "backend" | "frontend" | "database";
  onBack: () => void;
}

export function CodeView({ result, defaultTab, onBack }: CodeViewProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="shrink-0 px-5 py-2.5 flex items-center gap-3"
        style={{ background: "var(--panel-elevated)", borderBottom: "1px solid var(--panel-border)" }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
          style={{ background: "var(--surface-soft)", color: "var(--muted-text)", border: "1px solid var(--surface-soft-border)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--surface-soft-border)";
            (e.currentTarget as HTMLElement).style.color = "var(--app-text)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--surface-soft)";
            (e.currentTarget as HTMLElement).style.color = "var(--muted-text)";
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8 1L3 6l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Pipeline
        </button>
        <span className="text-sm font-bold" style={{ color: "var(--app-text)" }}>Generated Code</span>
        <span
          className="px-2 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: "var(--surface-soft)", color: "var(--muted-text)" }}
        >
          {result.backend.length + result.frontend.length + result.database.length} files
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          <span className="text-xs font-medium text-emerald-400">Generation complete</span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <FileExplorer result={result} defaultTab={defaultTab} />
      </div>
    </div>
  );
}
