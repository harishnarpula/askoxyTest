export interface AgentContext {
  userPrompt: string;

  intent?: string;
  domain?: string;

  // ✅ MAKE OPTIONAL
  plan?: {
    complianceNeeded?: string[];
    modules: string[];
    description?: string;
    actors?: string[];
  };

  isChat?: boolean;
  chatResponse?: string;

  productType?: string;
  regulator?: string;
  actors?: string[];

  // 🔥 Knowledge Layer
  useCases?: any[];
  domainFlows?: any;
  integrations?: any[];
  blueprint?: any;
  design?: any;

  // 🔥 Rules
  rules?: any[];

  // 🔥 Tech Stack
  techStack?: {
    frontend: string;
    backend: string;
    database: string;
    architecture?: string;
  };

  // 🔥 Prompt
  finalPrompt?: string;

  // 🔥 Structure
  folderStructure?: any;

  // 🔥 Code
  backendCode?: {
    files: { path: string; content: string }[];
  };

  frontendCode?: {
    files: { path: string; content: string }[];
  };

  dbCode?: {
    files: { path: string; content: string }[];
  };

  // 🔥 Testing
  testReport?: {
    issues: string[];
    fixRequired: boolean;
    suggestions: string[];
  };
}