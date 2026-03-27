import { streamAndCollect } from "../config/openai";
import { AgentContext } from "../types/context";
import { safeParse } from "../utils/utils";

export async function techStackAgent(
  ctx: AgentContext,
  send?: (event: string, data: any) => void
) {
  let fullText = "";

  const model = "gpt-5.4-mini";
  try {
    fullText = await streamAndCollect(
      {
        model,
       
        temperature: 0,
        instructions: `
You are a strict tech stack extraction agent.

Your job is to determine the correct tech stack based on:
1. User input (highest priority)
2. Domain defaults
3. Architecture hints

--------------------------------------------------

RETURN STRICT JSON:

{
  "frontend": "",
  "backend": "",
  "database": "",
  "architecture": ""
}

--------------------------------------------------

PRIORITY RULES:

🔥 PRIORITY 1: USER INPUT
- If user explicitly mentions tech → MUST use it

Examples:
"Java" → Spring Boot  
"Node" → Node.js  
"React" → React  
"Angular" → Angular  
"Postgres/MySQL/Mongo" → use as is  

--------------------------------------------------

🔥 PRIORITY 2: DOMAIN DEFAULTS

If NOT mentioned by user:

NBFC / Fintech:
- frontend → React
- backend → Spring Boot
- database → PostgreSQL
- architecture → modular monolith

Ecommerce / Generic:
- frontend → React
- backend → Node.js OR Spring Boot
- database → PostgreSQL
- architecture → modular monolith

--------------------------------------------------

🔥 PRIORITY 3: ARCHITECTURE DETECTION
- If user says "microservices" → architecture = microservices
- Else → modular monolith

--------------------------------------------------

🔥 STRICT RULES:
- Do NOT invent random tech
- Do NOT mix incompatible stacks
- Backend MUST map to real framework:
  Java → Spring Boot
  Node → Express/Fastify

Return ONLY JSON.
`,

        input: `
USER INPUT:
"${ctx.userPrompt}"

DOMAIN:
${ctx.domain}
`,
      },
      send,
      "techstack-token"
    );
  } catch (err) {
    console.error("❌ Streaming error in techStackAgent:", err);
    throw err;
  }

  let data = safeParse(fullText) || {};

  if (!data.backend) {
    if (ctx.domain === "NBFC-P2P") {
      data.backend = "Spring Boot";
    } else {
      data.backend = "Node.js";
    }
  }

  if (!data.frontend) {
    data.frontend = "React";
  }

  if (!data.database) {
    data.database = "PostgreSQL";
  }

  if (!data.architecture) {
    data.architecture = "modular monolith";
  }

  ctx.techStack = data;

  console.log("✅ Tech stack selected:", ctx.techStack);

  send?.("techstack-complete", ctx.techStack);

  return ctx;
}
