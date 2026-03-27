import { streamAndCollect } from "../config/openai";
import { AgentContext } from "../types/context";
import { safeParse } from "../utils/utils";

export async function validationAgent(
  ctx: AgentContext,
  send?: (event: string, data: any) => void,
) {
  const isNBFC = ctx.domain === "NBFC-P2P";

  const model = "gpt-5.4";
  const text = await streamAndCollect(
    {
      model,
      max_output_tokens: 20000,
      
      instructions: `
You are a senior software auditor.

Your job is to validate a FULL generated system.

--------------------------------------------------

VALIDATION RULES:

1. API CONSISTENCY
2. USE CASE COVERAGE
3. DATABASE ALIGNMENT
4. ARCHITECTURE
5. SECURITY (JWT, RBAC)
${isNBFC ? "6. RBI COMPLIANCE (ONLY for NBFC)" : ""}

--------------------------------------------------

SEVERITY GUIDELINES:

- HIGH:
  - Missing APIs
  - Broken DB relations
  - Security missing
  - Major use case missing

- MEDIUM:
  - Partial implementation
  - Minor inconsistency

- LOW:
  - Naming issues
  - Minor improvements

--------------------------------------------------

DECISION LOGIC:

- If ANY HIGH issue → fixRequired = true
- If only MEDIUM issues → fixRequired = true
- If only LOW issues → fixRequired = false

--------------------------------------------------

OUTPUT STRICT JSON:

{
  "status": "PASS | FAIL",
  "fixRequired": true,
  "issues": [
    {
      "type": "",
      "description": "",
      "severity": "HIGH | MEDIUM | LOW"
    }
  ],
  "suggestions": []
}

Return ONLY JSON.
`,

      input: `
Backend Code:
${JSON.stringify(ctx.backendCode || {})}

Frontend Code:
${JSON.stringify(ctx.frontendCode || {})}

DB Code:
${JSON.stringify(ctx.dbCode || {})}

APIs:
${JSON.stringify(ctx.design?.apis || [])}

Use Cases:
${JSON.stringify(ctx.useCases || [])}

Rules:
${JSON.stringify(ctx.rules || [])}
`,
    },
    send,
    "validation-token",
  );


  const data = safeParse(text) || {};

  const issues = Array.isArray(data.issues) ? data.issues : [];

  const hasHigh = issues.some((i: any) => i.severity === "HIGH");
  const hasMedium = issues.some((i: any) => i.severity === "MEDIUM");

  let fixRequired = false;

  if (hasHigh) {
    fixRequired = true;
  } else if (hasMedium) {
    fixRequired = true;
  } else {
    fixRequired = false;
  }

  const report = {
    status: data.status === "FAIL" ? "FAIL" : "PASS",
    issues,
    suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
    fixRequired,
  };

  ctx.testReport = report;

  console.log("✅ Validation:", report.status);
  console.log("⚠️ Issues:", issues.length);
  console.log("🔧 Fix Required:", fixRequired);

  send?.("validation-complete", {
    status: report.status,
    issues: issues.length,
    fixRequired,
  });

  return ctx;
}
