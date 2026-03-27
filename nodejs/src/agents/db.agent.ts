import { streamAndCollect } from "../config/openai";
import { AgentContext } from "../types/context";
import { getInternalApis } from "../utils/apiUtils";
import { safeParse } from "../utils/utils";
import { mergeFiles } from "../utils/fileMerge";

export async function dbAgent(
  ctx: AgentContext,
  send?: (event: string, data: any) => void
) {
  const internalApis = getInternalApis(ctx.design?.apis || []);
  const isFixMode = ctx.testReport?.fixRequired;

  const model = isFixMode ? "gpt-5-codex" : "gpt-5.4";
  const text = await streamAndCollect(
    {
      model,
      max_output_tokens: 50000,

      instructions: `
You are a senior database architect.

Your job is to ${isFixMode
          ? "FIX EXISTING DATABASE (PATCH MODE)"
          : "Generate COMPLETE DATABASE STRUCTURE (PRODUCTION READY)"
        }.

--------------------------------------------------

CRITICAL REQUIREMENTS:

${isFixMode
          ? `
FIX MODE RULES (VERY STRICT):

- ONLY fix issues mentioned
- DO NOT redesign schema
- DO NOT remove existing tables
- DO NOT break relationships
- ONLY patch required SQL

Return ONLY updated files
`
          : `
GENERATION MODE RULES (VERY STRICT):

You MUST generate a COMPLETE database setup.

--------------------------------

MUST INCLUDE FILES:

1. SCHEMA:
- db/schema/schema.sql
  - All tables
  - Primary keys
  - Foreign keys
  - Indexes

2. MIGRATIONS:
- db/migrations/V1__init.sql
- db/migrations/V2__additional.sql (if needed)

3. SEEDS:
- db/seeds/seed.sql
  - Sample data

4. CONFIG:
- docker-compose.yml (PostgreSQL setup)

--------------------------------

DATABASE DESIGN RULES:

- Tables must match dbSchema exactly
- Include relationships (FKs)
- Include constraints (NOT NULL, UNIQUE)
- Include indexes where needed

--------------------------------

DOMAIN HANDLING:

If domain = NBFC-P2P:
- MUST include tables for:
  - users
  - loans
  - investments
  - repayments
  - escrow_accounts
  - transactions
  - ledger_entries

--------------------------------

IMPORTANT:

- MUST generate multiple files (not single file)
- MUST be production-ready
- MUST align with APIs

--------------------------------

RUN REQUIREMENT:

- Database should be usable with PostgreSQL
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
Modules:
${JSON.stringify(ctx.design?.modules || [])}

Database Schema:
${JSON.stringify(ctx.design?.dbSchema || [])}

APIs:
${JSON.stringify(internalApis || [])}

--------------------------------------------------

EXISTING DB CODE (ONLY FOR FIX MODE):
${JSON.stringify(ctx.dbCode || {})}

ISSUES:
${JSON.stringify(ctx.testReport?.issues || [])}
`,
    },
    send,
    "db-token"
  );


  const data = safeParse(text) || {};

  const files = Array.isArray(data.files) ? data.files : [];

  if (files.length === 0) {
    throw new Error("❌ DBAgent: No files generated");
  }

  if (isFixMode && ctx.dbCode?.files?.length) {
    const mergedFiles = mergeFiles(ctx.dbCode.files, files);

    ctx.dbCode = {
      files: mergedFiles,
    };

    console.log("🛠️ DB patched (merged):", mergedFiles.length);
  } else {
    ctx.dbCode = { files };
    console.log("✅ DB generated:", files.length);
  }

  console.log("✅ DB generated:", files.length);

  send?.("db-complete", {
    count: files.length,
  });

  return ctx;
}
