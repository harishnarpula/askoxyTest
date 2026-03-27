export interface PipelineStep {
  step: number;
  label: string;
  status: "idle" | "streaming" | "completed" | "error";
  data?: unknown;
}

export interface CodeFile {
  path: string;
  content: string;
}

export interface GenerationResult {
  backend: CodeFile[];
  frontend: CodeFile[];
  database: CodeFile[];
}

// Real OpenAI token streamed per step
export interface StepToken {
  step: number;
  text: string;
}
