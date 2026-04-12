import { useEffect, useRef, useState } from "react";
import { WebContainer } from "@webcontainer/api";
import type { CodeFile } from "../type/file";
import { fetchFileContent } from "../hooks/driveApi";

interface Props {
  projectTitle: string;
  tree: CodeFile[];
  fileCache: Map<string, string>;
  onClose: () => void;
}

type Status = "detecting" | "loading" | "installing" | "starting" | "ready" | "error" | "backend-only";

// ── A node is a FILE if children is null OR hasChildren is false
function isFileNode(node: CodeFile): boolean {
  return node.children === null || node.hasChildren === false || (!node.children && !node.hasChildren);
}

// ── Recursively build WebContainer file tree from CodeFile nodes
async function buildWCFiles(
  nodes: CodeFile[],
  cache: Map<string, string>
): Promise<Record<string, any>> {
  const result: Record<string, any> = {};
  for (const node of nodes) {
    if (isFileNode(node)) {
      let content = cache.get(node.id) ?? "";
      if (!content) {
        try { content = await fetchFileContent(node.id); } catch { content = ""; }
      }
      result[node.name] = { file: { contents: content } };
    } else if (Array.isArray(node.children) && node.children.length > 0) {
      const sub = await buildWCFiles(node.children, cache);
      result[node.name] = { directory: sub };
    }
  }
  return result;
}

// ── FRONTEND DETECTION
// The API returns top-level folders: backend, frontend, database (or similar names)
// We need to find the frontend folder precisely.

const FRONTEND_NAMES = ["frontend", "client", "web", "ui", "app", "react", "vue", "angular", "next", "webapp", "front"];
const BACKEND_NAMES  = ["backend", "server", "api", "service", "services", "java", "spring", "python", "django", "flask", "go", "dotnet", "node-backend"];
const DB_NAMES       = ["database", "db", "sql", "mongo", "migrations", "schema"];

function isFrontendFolder(node: CodeFile): boolean {
  if (!Array.isArray(node.children)) return false;
  const name = node.name.toLowerCase();

  // Explicit backend/db — skip
  if (BACKEND_NAMES.some(n => name.includes(n))) return false;
  if (DB_NAMES.some(n => name.includes(n))) return false;

  // Explicit frontend name — yes
  if (FRONTEND_NAMES.some(n => name === n || name.startsWith(n))) return true;

  // Check children for frontend indicators
  const childNames = node.children.map(c => c.name.toLowerCase());
  if (childNames.some(n => n.startsWith("vite.config"))) return true;
  if (childNames.some(n => n.startsWith("next.config"))) return true;
  if (childNames.includes("angular.json")) return true;
  if (childNames.includes("index.html")) return true;
  if (childNames.includes("package.json")) {
    // Has package.json — check it's not a backend
    if (!BACKEND_NAMES.some(n => name.includes(n))) return true;
  }

  return false;
}

function isBackendOnlyProject(topLevel: CodeFile[]): { yes: boolean; type: string } {
  // If ALL top-level folders are backend/db with no frontend
  const hasFrontend = topLevel.some(n => Array.isArray(n.children) && isFrontendFolder(n));
  if (hasFrontend) return { yes: false, type: "" };

  // Check for backend-only indicators at root level
  for (const n of topLevel) {
    if (!Array.isArray(n.children)) continue;
    const names = n.children.map(c => c.name.toLowerCase());
    if (names.includes("pom.xml") || names.some(x => x.endsWith(".java")))
      return { yes: true, type: "Spring Boot (Java)" };
    if (names.includes("build.gradle"))
      return { yes: true, type: "Gradle (Java)" };
    if (names.includes("manage.py"))
      return { yes: true, type: "Django (Python)" };
    if (names.includes("go.mod"))
      return { yes: true, type: "Go" };
    if (names.some(x => x.endsWith(".csproj")))
      return { yes: true, type: ".NET" };
  }

  return { yes: false, type: "" };
}

// ── Find frontend folder from top-level nodes
function findFrontendFolder(topLevel: CodeFile[]): CodeFile | null {
  // Pass 1: exact name match
  for (const n of topLevel) {
    if (!Array.isArray(n.children)) continue;
    const name = n.name.toLowerCase();
    if (FRONTEND_NAMES.some(fn => name === fn)) return n;
  }
  // Pass 2: name starts with frontend keyword
  for (const n of topLevel) {
    if (!Array.isArray(n.children)) continue;
    const name = n.name.toLowerCase();
    if (FRONTEND_NAMES.some(fn => name.startsWith(fn))) return n;
  }
  // Pass 3: children contain frontend indicators
  for (const n of topLevel) {
    if (!Array.isArray(n.children)) continue;
    if (BACKEND_NAMES.some(bn => n.name.toLowerCase().includes(bn))) continue;
    if (DB_NAMES.some(dn => n.name.toLowerCase().includes(dn))) continue;
    const childNames = n.children.map(c => c.name.toLowerCase());
    if (
      childNames.some(x => x.startsWith("vite.config")) ||
      childNames.some(x => x.startsWith("next.config")) ||
      childNames.includes("angular.json") ||
      childNames.includes("index.html")
    ) return n;
  }
  // Pass 4: any folder with package.json that isn't backend/db
  for (const n of topLevel) {
    if (!Array.isArray(n.children)) continue;
    if (BACKEND_NAMES.some(bn => n.name.toLowerCase().includes(bn))) continue;
    if (DB_NAMES.some(dn => n.name.toLowerCase().includes(dn))) continue;
    const childNames = n.children.map(c => c.name.toLowerCase());
    if (childNames.includes("package.json")) return n;
  }
  return null;
}

// ── Detect npm run command from package.json in WC files
function detectStartCmd(wcFiles: Record<string, any>): string {
  const pkgRaw = wcFiles["package.json"]?.file?.contents ?? "";
  if (!pkgRaw) return "dev";
  try {
    const pkg = JSON.parse(pkgRaw);
    if (pkg.scripts?.dev)   return "dev";
    if (pkg.scripts?.start) return "start";
    if (pkg.scripts?.serve) return "serve";
  } catch { /* ignore */ }
  return "dev";
}

let wcInstance: WebContainer | null = null;

async function getWC(): Promise<WebContainer> {
  if (!wcInstance) {
    if (typeof crossOriginIsolated === "undefined" || !crossOriginIsolated) {
      throw new Error(
        "Cross-Origin Isolation is not active. " +
        "The server must send: Cross-Origin-Opener-Policy: same-origin " +
        "and Cross-Origin-Embedder-Policy: require-corp"
      );
    }
    wcInstance = await WebContainer.boot();
  }
  return wcInstance;
}

export default function ProjectPreview({ projectTitle, tree, fileCache, onClose }: Props) {
  const iframeRef   = useRef<HTMLIFrameElement>(null);
  const logsEndRef  = useRef<HTMLDivElement>(null);
  const [status, setStatus]               = useState<Status>("detecting");
  const [logs, setLogs]                   = useState<string[]>([]);
  const [errorMsg, setErrorMsg]           = useState("");
  const [detectedFolder, setDetectedFolder] = useState("");
  const [previewUrl, setPreviewUrl]       = useState("");
  const [showLogs, setShowLogs]           = useState(true);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-100), msg]);
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 30);
  };

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setStatus("detecting");
        addLog(`🔍 Analysing project: ${projectTitle}`);

        // ── Unwrap single root wrapper if present
        // e.g. tree = [{ name: "MyProject", children: [backend, frontend, database] }]
        let topLevel = tree;
        if (
          tree.length === 1 &&
          Array.isArray(tree[0].children) &&
          tree[0].children.length > 0
        ) {
          topLevel = tree[0].children;
          addLog(`📂 Root folder: ${tree[0].name}`);
        }

        addLog(`📂 Top-level folders: ${topLevel.map(n => n.name).join(", ")}`);

        // ── Check backend-only
        const beCheck = isBackendOnlyProject(topLevel);
        if (beCheck.yes) {
          if (!cancelled) { setErrorMsg(beCheck.type); setStatus("backend-only"); }
          return;
        }

        // ── Find frontend folder
        const frontendNode = findFrontendFolder(topLevel);
        if (!frontendNode) {
          if (!cancelled) {
            setErrorMsg(
              `Could not find a frontend folder in: ${topLevel.map(n => n.name).join(", ")}. ` +
              `Looking for folders named: ${FRONTEND_NAMES.join(", ")} or containing vite.config / package.json.`
            );
            setStatus("error");
          }
          return;
        }

        addLog(`✅ Frontend folder detected: "${frontendNode.name}"`);
        if (!cancelled) setDetectedFolder(frontendNode.name);

        // ── Build WC file tree from frontend folder's children
        setStatus("loading");
        addLog("📦 Building file map from frontend folder…");

        const targetNodes = frontendNode.children ?? [];
        if (targetNodes.length === 0) {
          if (!cancelled) {
            setErrorMsg(`Frontend folder "${frontendNode.name}" has no files. Wait for loading to complete.`);
            setStatus("error");
          }
          return;
        }

        const wcFiles = await buildWCFiles(targetNodes, fileCache);
        const fileCount = Object.keys(wcFiles).length;

        if (fileCount === 0) {
          if (!cancelled) {
            setErrorMsg("No files could be loaded. Please wait for the project to finish loading and try again.");
            setStatus("error");
          }
          return;
        }

        addLog(`✅ ${fileCount} top-level entries ready`);
        if (cancelled) return;

        // ── Boot WebContainer
        addLog("🚀 Booting WebContainer…");
        const wc = await getWC();
        if (cancelled) return;

        // ── Mount
        addLog("📁 Mounting files…");
        await wc.mount(wcFiles);
        addLog("✅ Files mounted");

        // ── npm install
        setStatus("installing");
        addLog("📦 Running npm install…");
        const install = await wc.spawn("npm", ["install"]);
        install.output.pipeTo(new WritableStream({ write: chunk => addLog(chunk.trim()) }));
        const installCode = await install.exit;
        if (installCode !== 0) {
          if (!cancelled) { setErrorMsg("npm install failed — check logs below."); setStatus("error"); }
          return;
        }
        addLog("✅ npm install complete");

        // ── npm run dev/start
        setStatus("starting");
        const cmd = detectStartCmd(wcFiles);
        addLog(`🚀 Starting: npm run ${cmd}…`);
        const dev = await wc.spawn("npm", ["run", cmd]);
        dev.output.pipeTo(new WritableStream({ write: chunk => addLog(chunk.trim()) }));

        // ── Wait for server-ready
        wc.on("server-ready", (_port, url) => {
          if (cancelled) return;
          addLog(`✅ Server ready → ${url}`);
          setPreviewUrl(url);
          setStatus("ready");
        });

      } catch (err: any) {
        if (!cancelled) {
          addLog(`❌ ${err?.message ?? "Unknown error"}`);
          setErrorMsg(err?.message ?? "Unknown error");
          setStatus("error");
        }
      }
    }

    run();
    return () => { cancelled = true; };
  }, [projectTitle, tree, fileCache]);

  useEffect(() => {
    if (previewUrl && iframeRef.current) {
      iframeRef.current.src = previewUrl;
    }
  }, [previewUrl]);

  const statusLabel: Record<Status, string> = {
    detecting:     "Detecting frontend…",
    loading:       "Loading files…",
    installing:    "Installing packages…",
    starting:      "Starting dev server…",
    ready:         "Running ✓",
    error:         "Error",
    "backend-only":"Backend only",
  };

  const isRunning = ["detecting", "loading", "installing", "starting"].includes(status);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#020414" }}>

      {/* ── Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderBottom: "1px solid #1a1f2e", background: "rgba(0,245,255,.03)", flexShrink: 0 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#00f5ff,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>▶</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Orbitron',monospace", fontWeight: 800, fontSize: "0.78rem", background: "linear-gradient(90deg,#00f5ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Live Preview{detectedFolder ? ` — ${detectedFolder}` : ""}
          </div>
          <div style={{ fontSize: "0.68rem", color: "#6c7a8a", marginTop: 1 }}>{projectTitle}</div>
        </div>

        {/* Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.7rem", color: isRunning ? "#00f5ff" : status === "ready" ? "#22c55e" : "#ef4444", flexShrink: 0 }}>
          {isRunning && <div style={{ width: 10, height: 10, border: "2px solid #00f5ff", borderTopColor: "transparent", borderRadius: "50%", animation: "wcSpin 0.7s linear infinite" }} />}
          {status === "ready" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />}
          {statusLabel[status]}
        </div>

        <button onClick={() => setShowLogs(v => !v)}
          style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,.1)", background: showLogs ? "rgba(0,245,255,.1)" : "rgba(255,255,255,.05)", color: showLogs ? "#00f5ff" : "#a0aec0", fontSize: "0.68rem", cursor: "pointer" }}>
          {showLogs ? "Hide Logs" : "Show Logs"}
        </button>

        <button onClick={onClose}
          style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "#a0aec0", fontSize: "0.68rem", cursor: "pointer" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.1)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.05)")}>
          ✕ Close
        </button>
      </div>

      {/* ── Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Backend-only */}
        {status === "backend-only" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "0 32px" }}>
            <div style={{ fontSize: "2.5rem" }}>🖥️</div>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#f59e0b" }}>Backend-Only Project</div>
            <div style={{ fontSize: "0.78rem", color: "#6c7a8a", maxWidth: 420, textAlign: "center", lineHeight: 1.7 }}>
              This is a <strong style={{ color: "#f59e0b" }}>{errorMsg}</strong> project.<br />
              Backend code cannot run in the browser.<br /><br />
              Only <strong style={{ color: "#00f5ff" }}>React / Vue / Angular / Vite / Next.js</strong> frontend projects can be previewed.
            </div>
            <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(0,245,255,.3)", background: "rgba(0,245,255,.08)", color: "#00f5ff", fontSize: "0.78rem", cursor: "pointer" }}>
              ← Go Back
            </button>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "0 32px" }}>
            <div style={{ fontSize: "2.5rem" }}>⚠️</div>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#ef4444" }}>Preview Failed</div>
            <div style={{ fontSize: "0.78rem", color: "#6c7a8a", maxWidth: 420, textAlign: "center", lineHeight: 1.7 }}>{errorMsg}</div>
            <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(0,245,255,.3)", background: "rgba(0,245,255,.08)", color: "#00f5ff", fontSize: "0.78rem", cursor: "pointer" }}>
              ← Go Back
            </button>
          </div>
        )}

        {/* Loading spinner */}
        {isRunning && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, border: "3px solid rgba(0,245,255,.15)", borderTopColor: "#00f5ff", borderRadius: "50%", animation: "wcSpin 0.9s linear infinite" }} />
            <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "0.78rem", color: "#00f5ff" }}>{statusLabel[status]}</div>
            <div style={{ fontSize: "0.7rem", color: "#6c7a8a" }}>This may take 30–60 seconds</div>
          </div>
        )}

        {/* iframe */}
        {status === "ready" && (
          <iframe
            ref={iframeRef}
            style={{ flex: 1, border: "none", width: "100%", height: showLogs ? "calc(100% - 180px)" : "100%" }}
            title="Live Preview"
            allow="cross-origin-isolated; clipboard-read; clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
          />
        )}

        {/* Logs panel — always visible during run, toggleable after */}
        {(isRunning || showLogs) && (status !== "backend-only") && (status !== "error") && (
          <div style={{ height: status === "ready" && showLogs ? 180 : isRunning ? 220 : 0, borderTop: "1px solid #1a1f2e", background: "#0a0e1a", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden", transition: "height 0.2s" }}>
            <div style={{ padding: "4px 12px", borderBottom: "1px solid #1a1f2e", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <span style={{ fontSize: "0.68rem", color: "#00f5ff", fontFamily: "'Orbitron',monospace" }}>Console</span>
              <button onClick={() => setLogs([])} style={{ fontSize: "0.65rem", color: "#6c7a8a", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "6px 12px" }}>
              {logs.map((l, i) => (
                <div key={i} style={{ fontFamily: "monospace", fontSize: "0.68rem", color: l.startsWith("❌") ? "#ef4444" : l.startsWith("✅") ? "#22c55e" : "#a0aec0", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{l}</div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes wcSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
