import { streamAndCollect } from "../config/openai";
import { AgentContext } from "../types/context";
import { safeParse } from "../utils/utils";

export async function structureAgent(
  ctx: AgentContext,
  send?: (event: string, data: any) => void
) {

const model = "gpt-5.4-mini";
  const text = await streamAndCollect(
    {
      model,
max_output_tokens: 10000,
      instructions: `
You are a senior software architect.

Your job is to generate COMPLETE real-world project structure.

--------------------------------------------------

IMPORTANT:

Generate FULL project structure including:
- Root files
- Config files
- Build tools
- Source folders
- Environment files

--------------------------------------------------

BACKEND RULES:

IF backend = "Spring Boot":
- Generate FULL Maven project:
  - pom.xml
  - src/main/java/...
  - src/main/resources/application.yml
  - src/test/java/
  - main application class

IF backend = "Node.js":
- Generate FULL Node project:
  - package.json
  - src/
  - config/
  - .env
  - server.js / app.js

--------------------------------------------------

FRONTEND RULES:

IF frontend = "React":
- Generate CRA/Vite style project:
  - package.json
  - public/index.html
  - src/App.jsx
  - src/main.jsx
  - src/pages/
  - src/components/
  - src/services/
  - src/routes/

IF frontend = "Angular":
- Generate Angular CLI structure

--------------------------------------------------

DATABASE RULES:

- /db/migrations/
- /db/schema/
- /db/seeds/
- docker-compose.yml

--------------------------------------------------

DEVOPS:

- Dockerfile
- docker-compose.yml
- .env.example
- README.md

--------------------------------------------------

STRICT RULES:

- MUST match tech stack exactly
- MUST include build files (pom.xml / package.json)
- MUST include entry point files
- MUST include module-wise folders
- MUST be production-ready
- DO NOT return only src folders

--------------------------------------------------

OUTPUT FORMAT:

{
  "projectStructure": [
    {
      "path": "",
      "type": "file|folder",
      "description": ""
    }
  ]
}

Return ONLY JSON.
`,

      input: `
Tech Stack:
${JSON.stringify(ctx.techStack || {})}

Modules:
${JSON.stringify(ctx.design?.modules || [])}
`,
    },
    send,
    "structure-token"
  );


  const data = safeParse(text) || {};

  const structure = Array.isArray(data.projectStructure)
    ? data.projectStructure
    : [];


  if (structure.length === 0) {
    console.warn("⚠️ StructureAgent: Empty project structure generated");
  }

  ctx.folderStructure = structure;

  console.log("✅ Full project structure generated:", structure.length);

  send?.("structure-complete", {
    count: structure.length,
  });

  return ctx;
}
