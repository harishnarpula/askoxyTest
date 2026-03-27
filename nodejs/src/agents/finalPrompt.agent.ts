import { streamAndCollect } from "../config/openai";
import { AgentContext } from "../types/context";

export async function promptBuilderAgent(
  ctx: AgentContext,
  send?: (event: string, data: any) => void
) {
  const isNBFC = ctx.domain === "NBFC-P2P";

  const model = "gpt-5.4";
  const text = await streamAndCollect(
    {
      model,
      max_output_tokens: 15000,
      temperature: 0,
     
      instructions: `
You are a senior system architect and prompt engineer.

Your job is to create a FINAL GENERATION PROMPT for code generation.

--------------------------------------------------

INSTRUCTIONS:

Create a structured prompt that includes:

1. System Overview
2. Modules
3. API Definitions
4. Database Schema
5. Business Logic
6. Security (JWT, RBAC)
7. Architecture

--------------------------------------------------

STRICT REQUIREMENTS:

- Use ONLY provided system design
- DO NOT invent modules
- DO NOT copy raw JSON
- Transform inputs into structured instructions
- Cover ALL use cases
- No placeholders
- No vague statements
- Must be production-ready

--------------------------------------------------

RETURN FORMAT (STRICT):

# System Overview
# Modules
# APIs
# Database
# Business Logic
# Security
# Architecture

- No JSON
- No markdown code blocks
- Only structured plain text

FINAL STRICT RULE:

- Output MUST start with "# System Overview"
- Do NOT include any extra text

--------------------------------------------------

OUTPUT:

Return ONLY the FINAL PROMPT
`,


      input: `
User Requirement:
${ctx.userPrompt || ""}

Domain:
${ctx.domain || ""}

Tech Stack:
${JSON.stringify(ctx.techStack || {})}

Actors:
${JSON.stringify(ctx.actors || [])}

Use Cases:
${JSON.stringify(ctx.useCases || [])}

Rules:
${JSON.stringify(ctx.rules || [])}

System Design:
${JSON.stringify(ctx.design || {})}

--------------------------------------------------

DOMAIN-SPECIFIC INSTRUCTIONS:

${isNBFC
          ? `
NBFC-P2P SYSTEM RULES:

- This is a DIGITAL LENDING PLATFORM (not a bank)
- DO NOT include:
  - Bank Officer
  - Branch workflows
  - CBS / LOS

- Core flows:
  - Borrower (apply loan, track loans)
  - Lender (invest, returns)
  - System (matching, escrow, repayment)

- Must include:
  - Loan lifecycle
  - Escrow handling
  - Repayment tracking
  - Ledger entries
  - Investment tracking

- Compliance:
  - RBI rules must be enforced
`
          : `
GENERAL SYSTEM RULES:

- Build system based on domain and use cases
- Do NOT assume NBFC-specific logic
- Include only relevant business flows
- Ensure system is scalable and production-ready
`
        }
`,
    },
    send,
    "prompt-builder-token"
  );

  ctx.finalPrompt = text || "";

  console.log("✅ Final Prompt Generated (AI)");

  send?.("prompt-builder-complete", {
    length: ctx.finalPrompt.length,
  });

  return ctx;
}
