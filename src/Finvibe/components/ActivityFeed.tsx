import { GenerationResult, PipelineStep } from "../type/types";
import { FileExplorer } from "./FileExplorer";

interface Props {
  result: GenerationResult | null;
  running: boolean;
  error: string | null;
  chatMessage: string | null;
  steps: PipelineStep[];
}

export function ActivityFeed({ result, running, error, chatMessage, steps }: Props) {
  if (result) {
    const total = result.backend.length + result.frontend.length + result.database.length;
    return (
      <div className="h-full flex flex-col gap-3">
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-semibold text-white">Generated Files</span>
          <span className="px-2 py-0.5 rounded-full bg-gray-800 text-xs text-gray-400">{total} files</span>
          <div className="ml-auto flex items-center gap-2 text-xs text-green-400">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            Complete
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <FileExplorer result={result} />
        </div>
      </div>
    );
  }

  if (chatMessage) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="max-w-lg px-6 py-4 bg-blue-900/20 border border-blue-700/40 rounded-xl text-sm text-blue-300">
          💬 {chatMessage}
        </div>
      </div>
    );
  }

  if (error && !running) {
    return (
      <div className="h-full flex items-start pt-8 justify-center">
        <div className="max-w-lg w-full px-4 py-3 bg-red-900/20 border border-red-700/40 rounded-xl text-sm text-red-400">
          ❌ {error}
        </div>
      </div>
    );
  }

  if (running) {
    const activeStep = steps.find(s => s.status === "streaming");
    const completedCount = steps.filter(s => s.status === "completed").length;
    const total = steps.length;

    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 select-none">
        {/* Animated rings */}
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border border-gray-800" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" style={{ animationDuration: "1.2s" }} />
          <div className="absolute inset-3 rounded-full border-2 border-transparent border-t-blue-300/60 animate-spin" style={{ animationDuration: "1.8s", animationDirection: "reverse" }} />
          <div className="absolute inset-6 rounded-full border-2 border-transparent border-t-blue-200/40 animate-spin" style={{ animationDuration: "2.4s" }} />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">⚡</div>
        </div>

        {/* Current step label */}
        <div className="text-center">
          {activeStep ? (
            <>
              <p className="text-sm font-medium text-white">{activeStep.label.split(" (")[0]}</p>
              <p className="text-xs text-gray-500 mt-1">AI is working on this step...</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">Initializing pipeline...</p>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-48">
          <div className="flex justify-between text-[10px] text-gray-600 mb-1.5">
            <span>{completedCount} of {total} steps</span>
            <span>{Math.round((completedCount / total) * 100)}%</span>
          </div>
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-700"
              style={{ width: `${(completedCount / total) * 100}%` }}
            />
          </div>
        </div>

        <p className="text-[11px] text-gray-600">Follow the live stream on the left panel</p>
      </div>
    );
  }

  return null;
}
