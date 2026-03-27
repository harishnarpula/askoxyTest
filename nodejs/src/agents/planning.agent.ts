import { streamAndCollect } from "../config/openai";
import { AgentContext } from "../types/context";
import { safeParse } from "../utils/utils";

export async function planningAgent(
  ctx: AgentContext,
  send?: (event: string, data: any) => void
) {
  let fullText = "";
  const model = "gpt-5.4-mini";

  try {
    fullText = await streamAndCollect(
      {
        model,
        max_output_tokens: 2000,
        temperature: 0,
        instructions: `
You are an intelligent intent detection and domain classification agent.

Your job is ONLY to:
1. Detect user intent (CHAT or BUILD)
2. Identify domain
3. Extract high-level system understanding

DO NOT enforce any domain rules.
DO NOT assume business logic.
DO NOT add extra constraints.

--------------------------------------------------

RETURN STRICT JSON:

{
  "type": "BUILD | CHAT",
  "chatResponse": "",
  "intent": "",
  "domain": "",
  "productType": "",
  "description": "",
  "actors": [],
  "highLevelModules": []
}

--------------------------------------------------

INTENT RULES:

- CHAT → greetings, questions, casual conversation
- BUILD → user wants to create/build/design a system

--------------------------------------------------

DOMAIN DETECTION:

- lending / loan / nbfc / p2p → "NBFC-P2P"
- ecommerce / shopping / store → "ECOMMERCE"
- banking → "BANKING"
- insurance → "INSURANCE"
- education → "EDTECH"
- otherwise → "GENERIC"

--------------------------------------------------

EXTRACTION RULES:

- intent → summarize user goal clearly
- productType → short type (e.g., "Marketplace", "Web App")
- description → 1–2 line system description
- actors → main users of system
- highLevelModules → main system parts

--------------------------------------------------

STRICT:

- If CHAT → ONLY fill chatResponse
- If BUILD → fill remaining fields
- KEEP IT HIGH LEVEL ONLY
- Return ONLY JSON
`,

        input: `
USER INPUT:
"${ctx.userPrompt}"
`,
      },
      send,
      "planning-token"
    );
  } catch (err) {
    console.error("❌ Streaming error in planningAgent:", err);
    throw err;
  }

  const data = safeParse(fullText);

  if (data.type === "CHAT") {
    ctx.isChat = true;
    ctx.chatResponse =
      data.chatResponse ||
      "Hey 👋 I can help you design and build applications. What would you like to create?";

    console.log("💬 Chat detected");

    send?.("chat", { message: ctx.chatResponse });

    return ctx;
  }


  ctx.isChat = false;

  ctx.intent = data.intent || ctx.userPrompt;
  ctx.domain = data.domain || "GENERIC";

  ctx.plan = {
    description: data.description || "",
    modules: data.highLevelModules || [],
    actors: data.actors || [],
  };

  ctx.productType = data.productType || "";
  ctx.actors = data.actors || [];

  console.log("✅ Planning completed:", {
    domain: ctx.domain,
    actors: ctx.actors,
  });

  send?.("planning-complete", {
    domain: ctx.domain,
    actors: ctx.actors,
    description: ctx.plan.description,
  });

  return ctx;
}
