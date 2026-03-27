import { streamAndCollect } from "../config/openai";
import { AgentContext } from "../types/context";
import { getInternalApis, getExternalApis } from "../utils/apiUtils";
import { safeParse } from "../utils/utils";
import { mergeFiles } from "../utils/fileMerge";

export async function frontendAgent(
  ctx: AgentContext,
  send?: (event: string, data: any) => void
) {
  const internalApis = getInternalApis(ctx.design?.apis || []);
  const externalApis = getExternalApis(ctx.design?.apis || []);
  const isFixMode = ctx.testReport?.fixRequired;

  const model = isFixMode ? "gpt-5-codex" : "gpt-5.4-mini";
  const text = await streamAndCollect(
    {
      model,
      max_output_tokens: 60000,

      instructions: `
You are a senior frontend architect.

Your job is to ${isFixMode
          ? "FIX EXISTING FRONTEND CODE (PATCH MODE)"
          : "Generate COMPLETE FRONTEND PROJECT (PRODUCTION READY)"
        }.

--------------------------------------------------

CRITICAL REQUIREMENTS:

${isFixMode
          ? `
FIX MODE RULES (VERY STRICT):

- ONLY fix issues mentioned
- DO NOT rewrite full UI
- DO NOT break existing components
- DO NOT change API paths
- ONLY patch required files

Return ONLY updated files
`
          : `
GENERATION MODE RULES (VERY STRICT):

You MUST generate a FULL frontend project like a real React app.

--------------------------------

IF frontend = "React":

MUST INCLUDE:

1. ROOT FILES:
- package.json (with dependencies: react, react-dom, axios, react-router-dom)
- index.html
- vite.config.js (if using Vite)
- .gitignore

2. ENTRY FILES:
- src/main.jsx
- src/App.jsx

3. CORE STRUCTURE:
- src/pages/
- src/components/
- src/services/
- src/hooks/
- src/routes/
- src/utils/

4. MODULE-BASED STRUCTURE:
Each module must have:
- pages (List, Detail, Form)
- components
- service integration

Example:
- src/pages/loan/
- src/pages/user/
- src/pages/repayment/

5. API INTEGRATION:
- Create service files for APIs
- Use EXACT API paths provided
- Use axios/fetch

6. ROUTING:
- Configure routes using react-router
- Each module must have routes

7. UI:
- Simple but functional UI
- Forms, tables, navigation

--------------------------------

IMPORTANT:

- MUST follow folderStructure EXACTLY
- MUST generate ALL required files
- MUST NOT skip essential files
- MUST be runnable

--------------------------------

RUN REQUIREMENT:

npm install
npm run dev
`
        }

--------------------------------------------------

DOMAIN HANDLING:

If domain = NBFC-P2P:
- UI should reflect:
  - Borrower dashboard
  - Lender dashboard
  - Loan flows
  - Repayment tracking

--------------------------------------------------

OUTPUT FORMAT:

{
  "files": [
    { "path": "", "content": "" }
  ]
}

Return ONLY JSON.
`,

      input: `
Tech Stack:
${JSON.stringify(ctx.techStack || {})}

Folder Structure:
${JSON.stringify(ctx.folderStructure || [])}

Internal APIs:
${JSON.stringify(internalApis || [])}

External APIs:
${JSON.stringify(externalApis || [])}

--------------------------------------------------

EXISTING CODE (ONLY FOR FIX MODE):
${JSON.stringify(ctx.frontendCode || {})}

ISSUES:
${JSON.stringify(ctx.testReport?.issues || [])}
`,
    },
    send,
    "frontend-token"
  );

  const data = safeParse(text) || {};

  const files = Array.isArray(data.files) ? data.files : [];


  if (files.length === 0) {
    throw new Error("❌ FrontendAgent: No files generated");
  }

  if (isFixMode && ctx.frontendCode?.files?.length) {
    const mergedFiles = mergeFiles(ctx.frontendCode.files, files);

    ctx.frontendCode = {
      files: mergedFiles,
    };

    console.log("🛠️ Frontend patched (merged):", mergedFiles.length);
  } else {
    ctx.frontendCode = { files };
    console.log("✅ Frontend generated:", files.length);
  }

  console.log("✅ Frontend generated:", files.length);
  send?.("frontend-complete", {
    count: files.length,
  });

  return ctx;
}
