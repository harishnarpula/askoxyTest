import { streamAndCollect } from "../config/openai";
import { AgentContext } from "../types/context";
import { safeParse } from "../utils/utils";

export async function systemDesignAgent(
  ctx: AgentContext,
  send?: (event: string, data: any) => void
) {

  const model = "gpt-5.4";
  const text = await streamAndCollect(
    {
      model,
      max_output_tokens: 20000,
      temperature: 0,
      instructions: `
You are a senior system architect.

Your job is to design a COMPLETE system based ONLY on what is required.


CORE INSTRUCTION:

- Analyze the use cases carefully
- Identify what components are ACTUALLY required
- DO NOT include unnecessary modules or features
- DO NOT skip required components

👉 Balance completeness with relevance

--------------------------------------------------

DOMAIN AWARENESS:

If domain = NBFC-P2P:
- This is a DIGITAL PLATFORM (not a bank)
- Avoid:
  - Bank Officer
  - Branch workflows
  - CBS / LOS
- Focus on:
  - Borrower
  - Lender
  - System automation
  - Escrow, repayment, ledger

If other domain:
- Adapt system based on domain naturally
- Do NOT force NBFC concepts

--------------------------------------------------

OUTPUT FORMAT (STRICT JSON):

{
  "modules": [
    { "name": "", "description": "" }
  ],
  "dbSchema": [
    {
      "table": "",
      "columns": [
        { "name": "", "type": "" }
      ]
    }
  ],
  "apis": [
    {
      "name": "",
      "method": "GET|POST|PUT|DELETE",
      "path": "",
      "module": "",
      "description": ""
    }
  ],
  "folders": [
    {
      "path": "",
      "type": "file|folder"
    }
  ]
}

--------------------------------------------------

QUALITY RULES:

- Every use case must be covered by:
  → at least one module
  → at least one API

- DB schema must support:
  → all major entities required by use cases

- APIs must include:
  → CRUD where needed
  → business flows (not only CRUD)

- Folder structure must reflect:
  → backend
  → frontend
  → database

--------------------------------------------------

SAFETY CONSTRAINTS:

- Do NOT return empty modules/apis/dbSchema
- Do NOT return generic placeholders
- Do NOT over-engineer unnecessary modules
- Keep system realistic and production-ready

Return ONLY JSON.
`,

      input: `
USER INPUT:
${ctx.userPrompt || ""}

DOMAIN:
${ctx.domain || ""}

TECH STACK:
${JSON.stringify(ctx.techStack || {})}

USE CASES:
${JSON.stringify(ctx.useCases || [])}

RULES:
${JSON.stringify(ctx.rules || [])}
`,
    },
    send,
    "system-design-token"
  );


  const data = safeParse(text) || {};


  if (!data.apis || !Array.isArray(data.apis) || data.apis.length === 0) {
    throw new Error("❌ SystemDesignAgent: No APIs generated");
  }

  if (!data.modules || !Array.isArray(data.modules) || data.modules.length === 0) {
    throw new Error("❌ SystemDesignAgent: No modules generated");
  }

  if (!data.dbSchema || !Array.isArray(data.dbSchema) || data.dbSchema.length === 0) {
    console.warn("⚠️ DB schema seems weak");
  }


  ctx.design = data;
  ctx.folderStructure = Array.isArray(data.folders) ? data.folders : [];

  console.log("✅ System design created:", {
    modules: data.modules?.length || 0,
    apis: data.apis?.length || 0,
    tables: data.dbSchema?.length || 0,
  });

  send?.("system-design-complete", {
    modules: data.modules?.length || 0,
    apis: data.apis?.length || 0,
    tables: data.dbSchema?.length || 0,
  });

  return ctx;
}
