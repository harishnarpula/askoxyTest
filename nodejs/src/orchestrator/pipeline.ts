import { AgentContext } from "../types/context";

import { planningAgent } from "../agents/planning.agent";
import { techStackAgent } from "../agents/techstack.agent";
import { useCaseAgent } from "../agents/useCaseAgent";
import { complianceAgent } from "../agents/compliance.agent";
import { systemDesignAgent } from "../agents/systemDesignAgent";
import { promptBuilderAgent } from "../agents/finalPrompt.agent";
import { structureAgent } from "../agents/structure.agent";
import { backendAgent } from "../agents/backend.agent";
import { frontendAgent } from "../agents/frontend.agent";
import { dbAgent } from "../agents/db.agent";
import { validationAgent } from "../agents/testing.agent";
import { domainGuardAgent } from "../agents/domainGuard.agent";

export type SSEEmitter = (event: string, data: unknown) => void;

const sessions = new Map<string, AgentContext>();

export function getSession(id: string): AgentContext | undefined {
  return sessions.get(id);
}

export function setSession(id: string, ctx: AgentContext) {
  sessions.set(id, ctx);
}

export function deleteSession(id: string) {
  sessions.delete(id);
}

function emit(
  send: SSEEmitter,
  step: number,
  label: string,
  status: "streaming" | "completed" | "error",
  data?: unknown,
) {
  send("step", { step, label, status, data });
}

function makeAgentSend(send: SSEEmitter, stepNum: number) {
  return (event: string, data: any) => {
    if (event.endsWith("-token")) {
      send("token", { step: stepNum, text: data.token ?? "" });
    }
  };
}

export async function runStep(
  stepName: string,
  ctx: AgentContext,
  send: SSEEmitter,
): Promise<{ ctx: AgentContext; done?: boolean; finalResult?: unknown }> {
  switch (stepName) {
    case "planning": {
      emit(send, 1, "Planning", "streaming");
      ctx = await planningAgent(ctx, makeAgentSend(send, 1));

      if (ctx.isChat) {
        send("chat", { message: ctx.chatResponse });
        return { ctx, done: true };
      }

      emit(send, 1, "Planning", "completed", {
        domain: ctx.domain,
        actors: ctx.actors,
      });
      return { ctx };
    }

    case "techstack": {
      emit(send, 2, "Tech Stack", "streaming");
      ctx = await techStackAgent(ctx, makeAgentSend(send, 2));
      emit(send, 2, "Tech Stack", "completed", ctx.techStack);
      return { ctx };
    }

    case "usecases": {
      emit(send, 3, "Use Cases", "streaming");
      ctx = await useCaseAgent(ctx, makeAgentSend(send, 3));

      if (!ctx.useCases?.length) throw new Error("No use cases generated");

      ctx = await domainGuardAgent(ctx);

      emit(send, 3, "Use Cases", "completed", {
        count: ctx.useCases?.length || 0,
      });

      return { ctx };
    }

    case "compliance": {
      emit(send, 4, "Compliance", "streaming");
      ctx = await complianceAgent(ctx, makeAgentSend(send, 4));

      emit(send, 4, "Compliance", "completed", {
        count: ctx.rules?.length,
      });

      return { ctx };
    }

    case "systemdesign": {
      emit(send, 5, "System Design", "streaming");
      ctx = await systemDesignAgent(ctx, makeAgentSend(send, 5));

      if (!ctx.design?.apis?.length) throw new Error("Design missing APIs");

      emit(send, 5, "System Design", "completed", {
        modules: ctx.design.modules.length,
        apis: ctx.design.apis.length,
      });

      return { ctx };
    }

    case "structure": {
      emit(send, 6, "Folder Structure", "streaming");
      ctx = await structureAgent(ctx, makeAgentSend(send, 6));

      emit(send, 6, "Folder Structure", "completed", {
        count: ctx.folderStructure?.length,
      });

      return { ctx };
    }

    case "prompt": {
      emit(send, 7, "Prompt Builder", "streaming");
      ctx = await promptBuilderAgent(ctx, makeAgentSend(send, 7));

      emit(send, 7, "Prompt Builder", "completed", {
        length: ctx.finalPrompt?.length,
      });

      return { ctx };
    }

    case "backend": {
      emit(send, 8, "Backend Generation", "streaming");
      ctx = await backendAgent(ctx, makeAgentSend(send, 8));

      emit(send, 8, "Backend Generation", "completed", {
        files: ctx.backendCode?.files?.length,
        fileList: ctx.backendCode?.files || [],
      });

      return { ctx };
    }

    case "frontend": {
      emit(send, 9, "Frontend Generation", "streaming");
      ctx = await frontendAgent(ctx, makeAgentSend(send, 9));

      emit(send, 9, "Frontend Generation", "completed", {
        files: ctx.frontendCode?.files?.length,
        fileList: ctx.frontendCode?.files || [],
      });

      return { ctx };
    }

    case "database": {
      emit(send, 10, "Database Generation", "streaming");
      ctx = await dbAgent(ctx, makeAgentSend(send, 10));

      emit(send, 10, "Database Generation", "completed", {
        files: ctx.dbCode?.files?.length,
        fileList: ctx.dbCode?.files || [],
      });

      return { ctx };
    }

    // 🔥🔥🔥 FIXED VALIDATION LOOP
    case "validation": {
      const MAX_RETRIES = 3;
      let attempt = 0;
      let lastIssueCount = Infinity;

      while (attempt < MAX_RETRIES) {
        emit(send, 11, `Validation (attempt ${attempt + 1})`, "streaming");

        ctx = await validationAgent(ctx, makeAgentSend(send, 11));

        const issues = ctx.testReport?.issues || [];
        const currentIssues = issues.length;

        const hasHigh = issues.some((i: any) => i.severity === "HIGH");

        // ✅ Stop if no fixes required
        if (!ctx.testReport?.fixRequired) {
          emit(send, 11, "Validation", "completed", ctx.testReport);
          break;
        }

        // ✅ Stop if only non-critical issues after first attempt
        if (attempt > 0 && !hasHigh) {
          console.log("🛑 Stopping: Only minor issues left");
          emit(send, 11, "Validation", "completed", ctx.testReport);
          break;
        }

        // ✅ Stop if no improvement
        if (currentIssues >= lastIssueCount) {
          console.log("⚠️ No improvement — stopping loop");
          emit(send, 11, "Validation", "completed", ctx.testReport);
          break;
        }

        lastIssueCount = currentIssues;

        const hasBackendIssue = issues.some((i: any) =>
          /backend|api|service|controller|security/i.test(i.type || ""),
        );

        const hasFrontendIssue = issues.some((i: any) =>
          /frontend|ui|component|react/i.test(i.type || ""),
        );

        const hasDbIssue = issues.some((i: any) =>
          /db|database|schema|sql/i.test(i.type || ""),
        );

        // ✅ Fix only required layers
        if (hasBackendIssue) {
          emit(send, 8, "Backend Fix", "streaming");
          ctx = await backendAgent(ctx, makeAgentSend(send, 8));
          emit(send, 8, "Backend Fix", "completed", {
            files: ctx.backendCode?.files?.length,
          });
        }

        if (hasFrontendIssue) {
          emit(send, 9, "Frontend Fix", "streaming");
          ctx = await frontendAgent(ctx, makeAgentSend(send, 9));
          emit(send, 9, "Frontend Fix", "completed", {
            files: ctx.frontendCode?.files?.length,
          });
        }

        if (hasDbIssue) {
          emit(send, 10, "Database Fix", "streaming");
          ctx = await dbAgent(ctx, makeAgentSend(send, 10));
          emit(send, 10, "Database Fix", "completed", {
            files: ctx.dbCode?.files?.length,
          });
        }

        emit(
          send,
          11,
          `Validation (attempt ${attempt + 1})`,
          "completed",
          ctx.testReport,
        );

        attempt++;
      }

      const finalResult = {
        backend: ctx.backendCode?.files || [],
        frontend: ctx.frontendCode?.files || [],
        database: ctx.dbCode?.files || [],
      };

      send("done", finalResult);

      return { ctx, done: true, finalResult };
    }

    default:
      throw new Error(`Unknown step: ${stepName}`);
  }
}

export async function runPipeline(userPrompt: string, send?: SSEEmitter) {
  const sse =
    send ??
    ((_e: string, d: unknown) => console.log(JSON.stringify(d, null, 2)));

  const steps = [
    "planning",
    "techstack",
    "usecases",
    "compliance",
    "systemdesign",
    "structure",
    "prompt",
    "backend",
    "frontend",
    "database",
    "validation",
  ];

  let ctx: AgentContext = { userPrompt, rules: [] };

  try {
    for (const step of steps) {
      const result = await runStep(step, ctx, sse);
      ctx = result.ctx;

      if (result.done)
        return result.finalResult ?? { message: ctx.chatResponse };
    }

    return {
      backend: ctx.backendCode?.files || [],
      frontend: ctx.frontendCode?.files || [],
      database: ctx.dbCode?.files || [],
    };
  } catch (error: any) {
    console.error("❌ PIPELINE FAILED:", error.message);
    sse("error", { message: error.message });
    throw error;
  }
}
