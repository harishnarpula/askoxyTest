import { streamAndCollect } from "../config/openai";
import { AgentContext } from "../types/context";
import { safeParse } from "../utils/utils";
import { loadAllUseCases } from "../utils/loadAllUseCases";
import { mergeUseCases } from "../utils/usecaseMerger";

type UseCaseCategory = "CAS" | "FMS" | "COLLECTIONS";

const VECTOR_STORES: Record<UseCaseCategory, string> = {
  CAS: "vs_69c0f3863cac81918a5d8c656f285b06",
  FMS: "vs_69c0f42a55c481918d7a621c524792a4",
  COLLECTIONS: "vs_69c0f3dc57a48191ad3d5de18ae06b99",
};

const VALID_CATEGORIES: UseCaseCategory[] = ["CAS", "FMS", "COLLECTIONS"];

function isBankingUseCase(uc: any) {
  const text = JSON.stringify(uc).toLowerCase();
  return (
    text.includes("bank officer") ||
    text.includes("branch") ||
    text.includes("cbs") ||
    text.includes("los")
  );
}

export async function useCaseAgent(
  ctx: AgentContext,
  send?: (event: string, data: any) => void
) {
  try {
    const decisionText = await streamAndCollect(
      {
        model: "gpt-5.4-mini",

        instructions: `
You are a use case category selection agent.

Your job:
- Analyze user request and domain
- Select relevant use case categories

--------------------------------------------------

OPTIONS:
- CAS → Onboarding, KYC, User
- FMS → Loan, EMI, Ledger
- COLLECTIONS → Repayment, Recovery, NPA

--------------------------------------------------

RULES:
- Lending → ALL categories
- Keep selection relevant to intent
- Do NOT over-select unnecessarily

Return ONLY JSON:
{
  "categories": []
}
`,

        input: `
User request:
"${ctx.userPrompt}"

Domain:
${ctx.domain}
`,
      },
      send,
      "usecase-category-token"
    );

    const decision = safeParse(decisionText);

    let categories: UseCaseCategory[] = (decision.categories || [])
      .filter((c: string) => VALID_CATEGORIES.includes(c as UseCaseCategory))
      .map((c: string) => c as UseCaseCategory);

    if (!categories.length) {
      categories = VALID_CATEGORIES;
    }

    console.log("✅ Selected categories:", categories);
    send?.("usecase-categories", { categories });

    let allUseCases: any[] = [];

    for (const category of categories) {
      const vectorId = VECTOR_STORES[category];
      if (!vectorId) continue;

      const text = await streamAndCollect(
        {
          model: "gpt-5.4-mini",

          instructions: `
You are a domain-aware use case generator.

Your job:
- Fetch relevant use cases from knowledge base
- Adapt them to given domain

--------------------------------------------------

RULES:

- Adapt use cases to DOMAIN
- If domain is NBFC-P2P:
  - Replace bank flows with platform flows
  - Use Borrower / Lender / Admin
  - Remove branch/CBS references

Return ONLY JSON:
{
  "useCases": [
    {
      "name": "",
      "description": "",
      "module": "",
      "api": ""
    }
  ]
}
`,

          input: `
Category: ${category}
User Intent: ${ctx.userPrompt}
Domain: ${ctx.domain}
`,

          tools: [
            {
              type: "file_search",
              vector_store_ids: [vectorId],
            },
          ],
        },
        send,
        "usecase-fetch-token"
      );

      const data = safeParse(text);

      if (data.useCases?.length) {
        allUseCases.push(...data.useCases);
      }
    }


    let filteredUseCases = allUseCases;

    if (ctx.domain === "NBFC-P2P") {
      filteredUseCases = allUseCases.filter((uc) => !isBankingUseCase(uc));
    }

    console.log("🧹 Filtered use cases:", filteredUseCases.length);


    const uniqueUseCases = Array.from(
      new Map(
        filteredUseCases.map((uc: any) => [`${uc.name}-${uc.module}`, uc])
      ).values()
    );


    const localData = loadAllUseCases();
    const finalUseCases = mergeUseCases(uniqueUseCases, localData);

    ctx.useCases = finalUseCases;
    (ctx as any).useCaseCategories = categories;

    console.log("✅ Final merged use cases:", finalUseCases.length);

    send?.("usecase-complete", {
      count: finalUseCases.length,
      categories,
    });

    return ctx;
  } catch (error) {
    console.error("❌ UseCaseAgent Error:", error);

    ctx.useCases = [];
    return ctx;
  }
}
