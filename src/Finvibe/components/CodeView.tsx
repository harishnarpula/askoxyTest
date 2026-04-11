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
        style={{ background: "#FFFFFF", borderBottom: "1px solid #EAECF2" }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
          style={{ background: "#F0F2F8", color: "#6B7A99", border: "1px solid #D8DCE8" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#E4E8F4";
            (e.currentTarget as HTMLElement).style.color = "#1A2035";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#F0F2F8";
            (e.currentTarget as HTMLElement).style.color = "#6B7A99";
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8 1L3 6l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Pipeline
        </button>
        <span className="text-sm font-bold" style={{ color: "#0A0E1A" }}>Generated Code</span>
        <span
          className="px-2 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: "#E8ECF4", color: "#6B7A99" }}
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
