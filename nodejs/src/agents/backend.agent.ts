import { streamAndCollect } from "../config/openai";
import { AgentContext } from "../types/context";
import { getInternalApis } from "../utils/apiUtils";
import { safeParse } from "../utils/utils";
import { mergeFiles } from "../utils/fileMerge";

export async function backendAgent(
  ctx: AgentContext,
  send?: (event: string, data: any) => void
) {
  const internalApis = getInternalApis(ctx.design?.apis || []);
  const isFixMode = ctx.testReport?.fixRequired;

  const model = isFixMode ? "gpt-5-codex" : "gpt-5.4";

  if (ctx.backendCode && !isFixMode) {
    console.log("⚠️ Backend already exists. Skipping regeneration.");
    return ctx;
  }

  const text = await streamAndCollect(
    {
      model,


      max_output_tokens: 80000,


      instructions: `
You are a senior backend architect.

Your job is to ${isFixMode
          ? "FIX EXISTING BACKEND CODE (PATCH MODE)"
          : "Generate COMPLETE BACKEND PROJECT (PRODUCTION READY)"
        }.

--------------------------------------------------

CRITICAL REQUIREMENTS:

${isFixMode
          ? `
FIX MODE RULES (VERY STRICT):

- ONLY modify files that have issues
- DO NOT rewrite entire project
- DO NOT remove working logic
- DO NOT change API paths
- DO NOT introduce new architecture
- ONLY patch minimal required code
- Keep structure exactly same

Return ONLY updated files
`
          : `
GENERATION MODE RULES (VERY STRICT):

You MUST generate a FULL backend project like real production setup.

--------------------------------

IF backend = "Spring Boot":

MUST INCLUDE:

1. ROOT:
- pom.xml
- .gitignore

2. MAIN:
- src/main/java/.../Application.java

3. CONFIG:
- src/main/resources/application.yml

4. STRUCTURE:
- controller/
- service/
- repository/
- entity/
- dto/
- config/
- exception/
- security/

5. MODULE PACKAGES:
- user/
- loan/
- repayment/

6. DATABASE:
- Entities must match dbSchema

7. APIs:
- Controllers + Services required

8. SECURITY:
- JWT or basic config

--------------------------------

IF backend = "Node.js":

MUST INCLUDE:

- package.json
- src/app.js
- config/
- modules/
- controllers/
- services/
- models/
- routes/

--------------------------------

IMPORTANT:

- MUST follow folderStructure EXACTLY
- MUST generate ALL files
- MUST be runnable
`
        }

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

APIs:
${JSON.stringify(internalApis || [])}

Use Cases:
${JSON.stringify(ctx.useCases || [])}

Rules:
${JSON.stringify(ctx.rules || [])}

--------------------------------------------------

EXISTING CODE:
${JSON.stringify(ctx.backendCode || {})}

ISSUES:
${JSON.stringify(ctx.testReport?.issues || [])}
`,
    },
    send,
    "backend-token"
  );

  const data = safeParse(text) || {};
  const files = Array.isArray(data.files) ? data.files : [];

  if (files.length === 0) {
    throw new Error("❌ BackendAgent: No files generated");
  }

  if (isFixMode && ctx.backendCode?.files?.length) {
    const mergedFiles = mergeFiles(ctx.backendCode.files, files);

    ctx.backendCode = {
      files: mergedFiles,
    };

    console.log("🛠️ Backend patched (merged):", mergedFiles.length);
  } else {
    ctx.backendCode = { files };
    console.log("✅ Backend generated:", files.length);
  }

  console.log("✅ Backend generated:", files.length);

  send?.("backend-complete", {
    count: files.length,
  });

  return ctx;
}