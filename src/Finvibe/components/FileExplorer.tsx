import { useState, useEffect } from "react";
import type { CodeFile, GenerationResult } from "../type/types";

interface Props {
  result: GenerationResult;
  defaultTab?: "backend" | "frontend" | "database";
}

type Tab = "backend" | "frontend" | "database";

type ProjectType =
  | "spring-boot"
  | "node-express"
  | "vite-react"
  | "react-native"
  | "nextjs"
  | "angular"
  | "python-django"
  | "python-flask"
  | "python-fastapi"
  | "html-css"
  | "dotnet"
  | "go"
  | "unknown";

function detectProjectType(files: CodeFile[]): ProjectType {
  const paths = files.map((f) => f.path.replace(/\\/g, "/").toLowerCase());
  const names = paths.map((p) => p.split("/").pop() ?? "");
  const has = (n: string) => names.includes(n);
  const hasExt = (ext: string) => names.some((n) => n.endsWith(ext));
  const hasPath = (frag: string) => paths.some((p) => p.includes(frag));
  if (has("pom.xml")) return "spring-boot";
  if (hasExt(".csproj")) return "dotnet";
  if (has("go.mod")) return "go";
  if (has("angular.json")) return "angular";
  if (names.some((n) => n.startsWith("next.config"))) return "nextjs";
  if (has("app.json") || has("metro.config.js") || hasPath("react-native"))
    return "react-native";
  if (names.some((n) => n.startsWith("vite.config"))) return "vite-react";
  if (has("manage.py")) return "python-django";
  if (has("requirements.txt") && (has("main.py") || hasPath("fastapi")))
    return "python-fastapi";
  if (has("requirements.txt")) return "python-flask";
  if (has("package.json")) return "node-express";
  if (has("index.html") && !has("package.json")) return "html-css";
  return "unknown";
}

interface ProjectMeta {
  label: string;
  icon: string;
  runSteps: string[];
  zipName: string;
}
function getProjectMeta(type: ProjectType, tabName: string): ProjectMeta {
  const b = tabName;
  const map: Record<ProjectType, ProjectMeta> = {
    "spring-boot": {
      label: "Spring Boot",
      icon: "🐘",
      zipName: `${b}-springboot`,
      runSteps: ["mvn clean install", "mvn spring-boot:run"],
    },
    "node-express": {
      label: "Node.js",
      icon: "🟩",
      zipName: `${b}-node`,
      runSteps: ["npm install", "npm start"],
    },
    "vite-react": {
      label: "React + Vite",
      icon: "⚡",
      zipName: `${b}-react`,
      runSteps: ["npm install", "npm run dev"],
    },
    "react-native": {
      label: "React Native",
      icon: "📱",
      zipName: `${b}-rn`,
      runSteps: ["npm install", "npx expo start"],
    },
    nextjs: {
      label: "Next.js",
      icon: "▲",
      zipName: `${b}-nextjs`,
      runSteps: ["npm install", "npm run dev"],
    },
    angular: {
      label: "Angular",
      icon: "🔴",
      zipName: `${b}-angular`,
      runSteps: ["npm install", "ng serve"],
    },
    "python-django": {
      label: "Django",
      icon: "🐍",
      zipName: `${b}-django`,
      runSteps: [
        "pip install -r requirements.txt",
        "python manage.py migrate",
        "python manage.py runserver",
      ],
    },
    "python-flask": {
      label: "Flask",
      icon: "🐍",
      zipName: `${b}-flask`,
      runSteps: ["pip install -r requirements.txt", "python app.py"],
    },
    "python-fastapi": {
      label: "FastAPI",
      icon: "🐍",
      zipName: `${b}-fastapi`,
      runSteps: [
        "pip install -r requirements.txt",
        "uvicorn main:app --reload",
      ],
    },
    "html-css": {
      label: "HTML / CSS",
      icon: "🌐",
      zipName: `${b}-web`,
      runSteps: ["Open index.html in browser"],
    },
    dotnet: {
      label: ".NET",
      icon: "💜",
      zipName: `${b}-dotnet`,
      runSteps: ["dotnet restore", "dotnet run"],
    },
    go: {
      label: "Go",
      icon: "🐹",
      zipName: `${b}-go`,
      runSteps: ["go mod tidy", "go run main.go"],
    },
    unknown: {
      label: "Project",
      icon: "📦",
      zipName: `${b}-project`,
      runSteps: ["See README.md"],
    },
  };
  return map[type];
}

// ── Tree ─────────────────────────────────────────────────────────────────────

interface TreeNode {
  name: string;
  path: string;
  isFile: boolean;
  file?: CodeFile;
  children: TreeNode[];
}

function buildTree(files: CodeFile[]): TreeNode {
  const root: TreeNode = {
    name: "root",
    path: "",
    isFile: false,
    children: [],
  };
  for (const file of files) {
    const parts = file.path.replace(/\\/g, "/").split("/").filter(Boolean);
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join("/");
      let child = node.children.find((c) => c.name === part);
      if (!child) {
        child = { name: part, path: fullPath, isFile: isLast, children: [] };
        if (isLast) child.file = file;
        node.children.push(child);
      }
      node = child;
    }
  }
  sortTree(root);
  return root;
}
function sortTree(n: TreeNode) {
  n.children.sort((a, b) =>
    a.isFile !== b.isFile ? (a.isFile ? 1 : -1) : a.name.localeCompare(b.name),
  );
  n.children.forEach(sortTree);
}
function collectFolderPaths(
  node: TreeNode,
  acc = new Set<string>(),
): Set<string> {
  if (!node.isFile && node.path) acc.add(node.path);
  node.children.forEach((c) => collectFolderPaths(c, acc));
  return acc;
}

// ── File icon ─────────────────────────────────────────────────────────────────

function fileIcon(name: string): string {
  const lower = name.toLowerCase();
  const ext = lower.split(".").pop() ?? "";
  if (lower === "pom.xml") return "🐘";
  if (lower === "dockerfile") return "🐳";
  if (lower === "docker-compose.yml" || lower === "docker-compose.yaml")
    return "🐳";
  if (lower === "package.json") return "📦";
  if (lower === "package-lock.json") return "🔒";
  if (lower === "go.mod") return "🐹";
  if (lower === "requirements.txt") return "🐍";
  if (lower === "manage.py") return "🐍";
  if (lower === "angular.json") return "🔴";
  if (lower.startsWith("next.config")) return "▲";
  if (lower.startsWith("vite.config")) return "⚡";
  if (lower === ".env" || lower === ".env.example") return "🔑";
  if (lower === "readme.md") return "📖";
  if (lower === ".gitignore") return "🚫";
  const map: Record<string, string> = {
    java: "☕", kt: "🟣", scala: "🔴", ts: "🔷", tsx: "🔷",
    js: "🟨", jsx: "🟨", py: "🐍", go: "🐹", rs: "🦀",
    cs: "💜", rb: "💎", php: "🐘", sql: "🗄️", json: "📋",
    xml: "📄", yml: "⚙️", yaml: "⚙️", toml: "⚙️", properties: "⚙️",
    css: "🎨", scss: "🎨", sass: "🎨", less: "🎨", html: "🌐",
    md: "📝", sh: "💻", bash: "💻", png: "🖼️", jpg: "🖼️", svg: "🖼️",
  };
  return map[ext] ?? "📄";
}

function detectLang(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    java: "java", py: "python", go: "go", rs: "rust", cs: "csharp",
    sql: "sql", json: "json", xml: "xml", yml: "yaml", yaml: "yaml",
    css: "css", scss: "css", html: "html", md: "markdown", sh: "bash",
  };
  return map[ext] ?? "text";
}

// ── Download ZIP ───────────────────────────────────────────────────────────────

async function downloadZip(result: GenerationResult, zipName: string) {
  const JSZipModule = await import("jszip");
  const JSZip = JSZipModule.default;
  type JSZipType = InstanceType<typeof JSZip>;
  const zip: JSZipType = new JSZip();

  const addFiles = (files: CodeFile[], folder: JSZipType) => {
    // Deduplicate by path — last one wins
    const seen = new Map<string, string>();
    for (const file of files) {
      const normalised = file.path.replace(/\\/g, "/").replace(/^\//, "");
      seen.set(normalised, file.content);
    }
    seen.forEach((content, filePath) => {
      const parts = filePath.split("/").filter(Boolean);
      let f: JSZipType = folder;
      for (let i = 0; i < parts.length - 1; i++) f = f.folder(parts[i]) as JSZipType;
      f.file(parts[parts.length - 1], content);
    });
  };

  if (result.backend.length > 0)  addFiles(result.backend,  zip.folder("backend") as JSZipType);
  if (result.frontend.length > 0) addFiles(result.frontend, zip.folder("frontend") as JSZipType);
  if (result.database.length > 0) addFiles(result.database, zip.folder("database") as JSZipType);

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${zipName}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Tab config ────────────────────────────────────────────────────────────────

const TAB_CONFIG: { key: Tab; icon: string; label: string; accent: string }[] =
  [
    { key: "backend", icon: "⚙️", label: "Backend", accent: "#10B981" },
    { key: "frontend", icon: "🎨", label: "Frontend", accent: "#A78BFA" },
    { key: "database", icon: "🗄️", label: "Database", accent: "#38BDF8" },
  ];

// ── Tree node view ────────────────────────────────────────────────────────────

function TreeNodeView({
  node, depth, openFolders, toggleFolder, selectedFile, onSelectFile, accent,
}: {
  node: TreeNode;
  depth: number;
  openFolders: Set<string>;
  toggleFolder: (p: string) => void;
  selectedFile: CodeFile | null;
  onSelectFile: (f: CodeFile) => void;
  accent: string;
}) {
  const indent = depth * 14;
  if (node.isFile && node.file) {
    const isSel = selectedFile?.path === node.file.path;
    return (
      <button
        onClick={() => onSelectFile(node.file!)}
        className="flex items-center gap-1.5 w-full text-left py-[3px] pr-2 rounded-md transition-all duration-100"
        style={{
          paddingLeft: indent + 18,
          background: isSel ? `${accent}16` : "transparent",
          color: isSel ? accent : "#6B7A99",
          borderLeft: isSel ? `2px solid ${accent}60` : "2px solid transparent",
        }}
        onMouseEnter={(e) => {
          if (!isSel) {
            (e.currentTarget as HTMLElement).style.background = "#F0F2F8";
            (e.currentTarget as HTMLElement).style.color = "#1A2035";
          }
        }}
        onMouseLeave={(e) => {
          if (!isSel) {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "#6B7A99";
          }
        }}
      >
        <span className="shrink-0 text-[11px]">{fileIcon(node.name)}</span>
        <span className="truncate text-[11px] font-mono">{node.name}</span>
      </button>
    );
  }
  const isOpen = openFolders.has(node.path);
  return (
    <div>
      <button
        onClick={() => toggleFolder(node.path)}
        className="flex items-center gap-1 w-full text-left py-[3px] pr-2 rounded-md text-[11px] transition-colors"
        style={{ paddingLeft: indent, color: "#6B7A99" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#0A0E1A")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#6B7A99")}
      >
        <span className="w-4 shrink-0 text-[10px] text-center" style={{ color: "#C4CBDA" }}>
          {isOpen ? "▾" : "▸"}
        </span>
        <span className="text-[11px] shrink-0 mr-0.5">
          {isOpen ? "📂" : "📁"}
        </span>
        <span className="font-mono truncate">{node.name}</span>
      </button>
      {isOpen &&
        node.children.map((child) => (
          <TreeNodeView
            key={child.path}
            node={child}
            depth={depth + 1}
            openFolders={openFolders}
            toggleFolder={toggleFolder}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
            accent={accent}
          />
        ))}
    </div>
  );
}

// ── Code block ────────────────────────────────────────────────────────────────

function CodeBlock({ code }: { code: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const lines = code.split("\n");
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="relative flex h-full overflow-hidden">
      <button
        onClick={copy}
        className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
        style={{
          background: copied ? "rgba(16,185,129,0.12)" : "#F0F2F8",
          color: copied ? "#059669" : "#6B7A99",
          border: copied ? "1px solid rgba(16,185,129,0.28)" : "1px solid #D8DCE8",
        }}
      >
        {copied ? "✓ Copied" : "Copy"}
      </button>
      <div className="flex text-xs font-mono w-full overflow-auto">
        <div
          className="select-none text-right py-4 pr-3 pl-3 shrink-0 leading-5"
          style={{
            background: "#F0F2F8",
            borderRight: "1px solid #E4E8F4",
            color: "#C4CBDA",
            minWidth: "3.2rem",
          }}
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <pre
          className="flex-1 p-4 overflow-x-auto leading-5 whitespace-pre"
          style={{ color: "#1A2035" }}
        >
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function FileExplorer({ result, defaultTab }: Props) {
  const resolveTab = (): Tab => {
    // Always honour the requested tab — even if empty (shows "No files yet")
    if (defaultTab) return defaultTab;
    if (result.backend.length > 0) return "backend";
    if (result.frontend.length > 0) return "frontend";
    if (result.database.length > 0) return "database";
    return "backend";
  };

  const [activeTab, setActiveTab] = useState<Tab>(resolveTab);

  // When defaultTab changes (user clicked a different step's View Code), switch tab
  useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab);
  }, [defaultTab]);
  const [selectedFiles, setSelectedFiles] = useState<Partial<Record<Tab, CodeFile>>>({});
  const [openFoldersMap, setOpenFoldersMap] = useState<Partial<Record<Tab, Set<string>>>>({});

  const files = result[activeTab];
  const tree = buildTree(files);
  const selectedFile = selectedFiles[activeTab] ?? null;
  const openFolders = openFoldersMap[activeTab] ?? new Set<string>();
  const projectType = detectProjectType(files);
  const meta = getProjectMeta(projectType, activeTab);
  const tabCfg = TAB_CONFIG.find((t) => t.key === activeTab)!;

  useEffect(() => {
    const freshTree = buildTree(result[activeTab]);
    setOpenFoldersMap((prev) => ({
      ...prev,
      [activeTab]: collectFolderPaths(freshTree),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, result[activeTab].length]);

  const toggleFolder = (path: string) =>
    setOpenFoldersMap((prev) => {
      const cur = prev[activeTab] ?? new Set<string>();
      const nxt = new Set(cur);
      nxt.has(path) ? nxt.delete(path) : nxt.add(path);
      return { ...prev, [activeTab]: nxt };
    });

  const selectFile = (f: CodeFile) =>
    setSelectedFiles((prev) => ({ ...prev, [activeTab]: f }));

  return (
    <div className="flex h-full" style={{ background: "#FFFFFF" }}>
      {/* ── Sidebar ── */}
      <div
        className="w-[230px] flex flex-col shrink-0"
        style={{ background: "#F8F9FC", borderRight: "1px solid #EAECF2" }}
      >
        {/* Tabs */}
        <div
          className="flex gap-1 p-2 shrink-0"
          style={{ borderBottom: "1px solid #EAECF2" }}
        >
          {TAB_CONFIG.map(({ key, icon, label, accent }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className="flex-1 py-1.5 px-1 rounded-xl transition-all duration-150 flex flex-col items-center gap-0.5"
                style={{
                  background: isActive ? `${accent}16` : "transparent",
                  color: isActive ? accent : "#9CAABE",
                  border: isActive ? `1px solid ${accent}28` : "1px solid transparent",
                }}
              >
                <span className="text-sm leading-none">{icon}</span>
                <span className="text-[10px] font-semibold">{label}</span>
                <span
                  className="text-[9px]"
                  style={{ color: isActive ? `${accent}88` : "#C4CBDA" }}
                >
                  {result[key].length} files
                </span>
              </button>
            );
          })}
        </div>

        {/* Project type + download */}
        <div
          className="px-2.5 py-2 shrink-0"
          style={{ borderBottom: "1px solid #EAECF2" }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-base">{meta.icon}</span>
            <span className="text-[11px] font-semibold" style={{ color: "#6B7A99" }}>
              {meta.label}
            </span>
          </div>
          <button
            onClick={() => downloadZip(result, "generated-project")}
            disabled={result.backend.length === 0 && result.frontend.length === 0 && result.database.length === 0}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${tabCfg.accent}90, ${tabCfg.accent})` }}
          >
            ⬇ Download All ZIP
          </button>
        </div>

        {/* Run commands */}
        {files.length > 0 && (
          <div
            className="px-2.5 py-2 shrink-0"
            style={{ borderBottom: "1px solid #EAECF2" }}
          >
            <p
              className="text-[9px] font-bold uppercase tracking-[0.1em] mb-1.5"
              style={{ color: "#C4CBDA" }}
            >
              Run
            </p>
            {meta.runSteps.map((step, i) => (
              <div key={i} className="flex gap-1.5 mb-0.5">
                <span
                  className="text-[9px] font-bold shrink-0 mt-0.5"
                  style={{ color: "#C4CBDA" }}
                >
                  {i + 1}.
                </span>
                <code
                  className="text-[10px] font-mono break-all leading-relaxed"
                  style={{ color: `${tabCfg.accent}CC` }}
                >
                  {step}
                </code>
              </div>
            ))}
          </div>
        )}

        {/* File tree */}
        <div className="flex-1 overflow-y-auto py-2 px-1.5" style={{ scrollbarWidth: "none" }}>
          {files.length === 0 ? (
            <p className="text-center py-6 text-[11px]" style={{ color: "#C4CBDA" }}>
              No files yet
            </p>
          ) : (
            tree.children.map((child) => (
              <TreeNodeView
                key={`${activeTab}::${child.path}`}
                node={child}
                depth={0}
                openFolders={openFolders}
                toggleFolder={toggleFolder}
                selectedFile={selectedFile}
                onSelectFile={selectFile}
                accent={tabCfg.accent}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Code viewer ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedFile ? (
          <>
            <div
              className="flex items-center gap-2.5 px-4 py-2.5 shrink-0"
              style={{ background: "#F8F9FC", borderBottom: "1px solid #EAECF2" }}
            >
              <span className="text-[13px] shrink-0">
                {fileIcon(selectedFile.path.split("/").pop() ?? "")}
              </span>
              <div
                className="flex items-center gap-1 text-[11px] font-mono flex-1 min-w-0 overflow-x-auto"
                style={{ scrollbarWidth: "none" }}
              >
                {selectedFile.path.split("/").map((part, i, arr) => (
                  <span key={i} className="flex items-center gap-1 shrink-0">
                    {i > 0 && (
                      <span style={{ color: "#D8DCE8" }}>/</span>
                    )}
                    <span
                      style={{
                        color: i === arr.length - 1 ? "#0A0E1A" : "#9CAABE",
                      }}
                    >
                      {part}
                    </span>
                  </span>
                ))}
              </div>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold shrink-0"
                style={{
                  background: `${tabCfg.accent}12`,
                  color: `${tabCfg.accent}CC`,
                  border: `1px solid ${tabCfg.accent}20`,
                }}
              >
                {detectLang(selectedFile.path)}
              </span>
            </div>
            <div className="flex-1 overflow-hidden" style={{ background: "#FFFFFF" }}>
              <CodeBlock code={selectedFile.content} path={selectedFile.path} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: `${tabCfg.accent}10`, border: `1px solid ${tabCfg.accent}20` }}
            >
              {meta.icon}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold mb-1" style={{ color: "#1A2035" }}>
                {meta.label}
              </p>
              <p className="text-xs" style={{ color: "#9CAABE" }}>
                {files.length} file{files.length !== 1 ? "s" : ""} · pick a file from the tree to view code
              </p>
            </div>
            {files.length > 0 && (
              <div
                className="px-5 py-4 rounded-2xl"
                style={{ background: "#F8F9FC", border: "1px solid #E8ECF4" }}
              >
                <p
                  className="text-[9px] font-bold uppercase tracking-[0.1em] mb-2.5"
                  style={{ color: "#9CAABE" }}
                >
                  To run
                </p>
                {meta.runSteps.map((step, i) => (
                  <div key={i} className="flex gap-2 mb-1">
                    <span className="text-[11px] font-bold shrink-0" style={{ color: "#9CAABE" }}>
                      {i + 1}.
                    </span>
                    <code className="text-[11px] font-mono" style={{ color: `${tabCfg.accent}CC` }}>
                      {step}
                    </code>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
