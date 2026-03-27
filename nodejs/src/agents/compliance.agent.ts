import { streamAndCollect } from "../config/openai";
import { AgentContext } from "../types/context";
import { safeParse } from "../utils/utils";

const VECTOR_STORE_ID = "vs_69ba8fdd65408191ad79287cae6c13a4";

export async function complianceAgent(
  ctx: AgentContext,
  send?: (event: string, data: any) => void
) {
  try {
    if (ctx.domain !== "NBFC-P2P") {
      console.log("ℹ️ Skipping compliance (non-NBFC domain)");

      ctx.rules = []; 
      return ctx;
    }

    const model = "gpt-5.4";

    const text = await streamAndCollect(
      {
        model,
        temperature: 0,
        instructions: `
You are a strict RBI compliance extraction agent for NBFC-P2P platforms.

Your job:
- Extract ONLY relevant RBI rules for NBFC-P2P lending systems
- Map rules to system modules and use cases

--------------------------------------------------

STRICT REQUIREMENTS:

- ONLY include RBI rules relevant to NBFC-P2P
- DO NOT include generic banking rules
- DO NOT include CBS / branch-related logic
- Rules must apply to digital lending platforms

--------------------------------------------------

OUTPUT FORMAT (STRICT JSON):

{
  "rules": [
    {
      "name": "",
      "description": "",
      "condition": "",
      "type": "hard|soft",
      "module": "",
      "appliesTo": [],
      "validationLogic": ""
    }
  ]
}

--------------------------------------------------

RULES:

- MUST map rules to use cases
- MUST assign module
- MUST provide validation logic
- MUST be applicable to NBFC-P2P

Return ONLY JSON.
`,

        input: `
User Requirement:
${ctx.userPrompt || ""}

Domain:
${ctx.domain || ""}

Use Cases:
${JSON.stringify(ctx.useCases || [])}

Focus Areas:
${ctx.plan?.complianceNeeded?.join(",") || ""}
`,

        tools: [
          {
            type: "file_search",
            vector_store_ids: [VECTOR_STORE_ID],
          },
        ],
      },
      send,
      "compliance-token"
    );

    const data = safeParse(text) || {};

    const rules = Array.isArray(data.rules) ? data.rules : [];

    ctx.rules = rules; 

    console.log("✅ Compliance rules extracted:", rules.length);

    send?.("compliance-complete", {
      count: rules.length,
    });

    return ctx;
  } catch (error) {
    console.error("❌ ComplianceAgent Error:", error);

    ctx.rules = [];

    return ctx;
  }
}
