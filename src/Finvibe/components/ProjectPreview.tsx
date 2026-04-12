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

// ── Flatten a node's children into WebContainer FileSystemTree format
async function buildWCFiles(
  nodes: CodeFile[],
  cache: Map<string, string>
): Promise<Record<string, any>> {
  const result: Record<string, any> = {};

  for (const node of nodes) {
    const isFile = node.children === null || node.hasChildren === false || (!node.children && !node.hasChildren);
    if (isFile) {
      let content = cache.get(node.id) ?? "";
      if (!content) {
        try { content = await fetchFileContent(node.id); } catch { content = ""; }
      }
      result[node.name] = { file: { contents: content } };
    } else if (Array.isArray(node.children) && node.children.length > 0) {
      const subTree = await buildWCFiles(node.children, cache);
      result[node.name] = { directory: subTree };
    }
  }
  return result;
}

// ── Detect frontend folder from project tree
function findFrontendNode(nodes: CodeFile[]): CodeFile | null {
  // Priority 1: folder explicitly named frontend/client/web/ui
  for (const n of nodes) {
    if (!Array.isArray(n.children)) continue;
    if (/(^frontend$|^client$|^web$|^ui$|^app$)/i.test(n.name)) return n;
  }
  // Priority 2: folder with vite.config / next.config / angular.json / index.html
  for (const n of nodes) {
    if (!Array.isArray(n.children)) continue;
    const names = n.children.map(c => c.name.toLowerCase());
    if (
      names.some(x => x.startsWith("vite.config")) ||
      names.some(x => x.startsWith("next.config")) ||
      names.includes("angular.json") ||
      names.includes("index.html")
    ) return n;
  }
  // Priority 3: folder with package.json that isn't backend/server/api/db
  for (const n of nodes) {
    if (!Array.isArray(n.children)) continue;
    const names = n.children.map(c => c.name.toLowerCase());
    if (
      names.includes("package.json") &&
      !/(backend|server|api|database|db)/i.test(n.name)
    ) return n;
  }
  return null;
}

// ── Detect if project is backend-only (no JS frontend)
function isBackendOnly(nodes: CodeFile[]): { yes: boolean; type: string } {
  for (const n of nodes) {
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

// ── Detect npm start command from package.json
function detectStartCmd(files: Record<string, any>): string {
  const pkgRaw = files["package.json"]?.file?.contents ?? "";
  if (!pkgRaw) return "dev";
  try {
    const pkg = JSON.parse(pkgRaw);
    if (pkg.scripts?.dev) return "dev";
    if (pkg.scripts?.start) return "start";
    if (pkg.scripts?.serve) return "serve";
  } catch { /* ignore */ }
  return "dev";
}

let wcInstance: WebContainer | null = null;

async function getWC(): Promise<WebContainer> {
  if (!wcInstance) {
    if (!crossOriginIsolated) {
      throw new Error(
        "Cross-Origin Isolation is not enabled. " +
        "Make sure the server sends: Cross-Origin-Opener-Policy: same-origin " +
        "and Cross-Origin-Embedder-Policy: require-corp headers."
      );
    }
    wcInstance = await WebContainer.boot();
  }
  return wcInstance;
}

export default function ProjectPreview({ projectTitle, tree, fileCache, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<Status>("detecting");
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [detectedFolder, setDetectedFolder] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [showLogs, setShowLogs] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-80), msg]);
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // ── Step 1: detect frontend folder
        setStatus("detecting");

        // unwrap single root folder
        let searchNodes = tree;
        if (tree.length === 1 && Array.isArray(tree[0].children)) {
          searchNodes = tree[0].children!;
        }

        // check backend-only
        const beCheck = isBackendOnly(searchNodes);
        if (beCheck.yes) {
          if (!cancelled) { setErrorMsg(beCheck.type); setStatus("backend-only"); }
          return;
        }

        const frontendNode = findFrontendNode(searchNodes);
        const targetNodes = frontendNode ? (frontendNode.children ?? []) : searchNodes;
        const folderName = frontendNode?.name ?? tree[0]?.name ?? projectTitle;

        if (!cancelled) setDetectedFolder(folderName);
        addLog(`✅ Detected frontend: ${folderName}`);

        // ── Step 2: build file tree
        setStatus("loading");
        addLog("📦 Building file map…");
        const wcFiles = await buildWCFiles(targetNodes, fileCache);

        if (Object.keys(wcFiles).length === 0) {
          if (!cancelled) { setErrorMsg("No files loaded yet. Please wait for the project to finish loading then try again."); setStatus("error"); }
          return;
        }
        addLog(`✅ ${Object.keys(wcFiles).length} files ready`);

        if (cancelled) return;

        // ── Step 3: boot WebContainer
        addLog("🚀 Booting WebContainer…");
        const wc = await getWC();
        if (cancelled) return;

        // ── Step 4: mount
        addLog("📁 Mounting files…");
        await wc.mount(wcFiles);
        addLog("✅ Mounted");

        // ── Step 5: install
        setStatus("installing");
        addLog("📦 Running npm install…");
        const install = await wc.spawn("npm", ["install"]);
        install.output.pipeTo(new WritableStream({ write: chunk => addLog(chunk) }));
        const installCode = await install.exit;
        if (installCode !== 0) {
          if (!cancelled) { setErrorMsg("npm install failed. Check logs."); setStatus("error"); }
          return;
        }
        addLog("✅ Installed");

        // ── Step 6: start dev server
        setStatus("starting");
        const cmd = detectStartCmd(wcFiles);
        addLog(`🚀 npm run ${cmd}…`);
        const dev = await wc.spawn("npm", ["run", cmd]);
        dev.output.pipeTo(new WritableStream({ write: chunk => addLog(chunk) }));

        // ── Step 7: wait for server-ready
        wc.on("server-ready", (_port, url) => {
          if (cancelled) return;
          addLog(`✅ Server ready: ${url}`);
          setPreviewUrl(url);
          setStatus("ready");
        });

      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err?.message ?? "Unknown error");
          setStatus("error");
        }
      }
    }

    run();
    return () => { cancelled = true; };
  }, [projectTitle, tree, fileCache]);

  // update iframe src when url arrives
  useEffect(() => {
    if (previewUrl && iframeRef.current) {
      iframeRef.current.src = previewUrl;
    }
  }, [previewUrl]);

  const statusLabel: Record<Status, string> = {
    detecting: "Detecting frontend…",
    loading: "Loading files…",
    installing: "Installing packages…",
    starting: "Starting dev server…",
    ready: "Running",
    error: "Error",
    "backend-only": "Backend only",
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

        {/* Status pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.7rem", color: isRunning ? "#00f5ff" : status === "ready" ? "#22c55e" : "#ef4444", flexShrink: 0 }}>
          {isRunning && <div style={{ width: 10, height: 10, border: "2px solid #00f5ff", borderTopColor: "transparent", borderRadius: "50%", animation: "wcSpin 0.7s linear infinite" }} />}
          {status === "ready" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />}
          {statusLabel[status]}
        </div>

        {/* Logs toggle */}
        <button
          onClick={() => setShowLogs(v => !v)}
          style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,.1)", background: showLogs ? "rgba(0,245,255,.1)" : "rgba(255,255,255,.05)", color: showLogs ? "#00f5ff" : "#a0aec0", fontSize: "0.68rem", cursor: "pointer" }}
        >
          {showLogs ? "Hide Logs" : "Logs"}
        </button>

        <button
          onClick={onClose}
          style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "#a0aec0", fontSize: "0.68rem", cursor: "pointer" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.1)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.05)")}
        >
          ✕ Close
        </button>
      </div>

      {/* ── Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>

        {/* Backend-only message */}
        {status === "backend-only" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "0 32px" }}>
            <div style={{ fontSize: "2.5rem" }}>🖥️</div>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#f59e0b" }}>Backend-Only Project</div>
            <div style={{ fontSize: "0.78rem", color: "#6c7a8a", maxWidth: 400, textAlign: "center", lineHeight: 1.7 }}>
              This is a <strong style={{ color: "#f59e0b" }}>{errorMsg}</strong> project. Backend code cannot run in the browser.
              <br /><br />
              Only React / Vue / Angular / Vite / Next.js frontend projects can be previewed here.
            </div>
            <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(0,245,255,.3)", background: "rgba(0,245,255,.08)", color: "#00f5ff", fontSize: "0.78rem", cursor: "pointer" }}>
              ← Go Back
            </button>
          </div>
        )}

        {/* Error message */}
        {status === "error" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "0 32px" }}>
            <div style={{ fontSize: "2.5rem" }}>⚠️</div>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#ef4444" }}>Preview Failed</div>
            <div style={{ fontSize: "0.78rem", color: "#6c7a8a", maxWidth: 400, textAlign: "center", lineHeight: 1.7 }}>{errorMsg}</div>
            <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(0,245,255,.3)", background: "rgba(0,245,255,.08)", color: "#00f5ff", fontSize: "0.78rem", cursor: "pointer" }}>
              ← Go Back
            </button>
          </div>
        )}

        {/* Loading spinner */}
        {isRunning && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, border: "3px solid rgba(0,245,255,.2)", borderTopColor: "#00f5ff", borderRadius: "50%", animation: "wcSpin 0.9s linear infinite" }} />
            <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "0.78rem", color: "#00f5ff" }}>{statusLabel[status]}</div>
            <div style={{ fontSize: "0.7rem", color: "#6c7a8a" }}>This may take 30–60 seconds</div>
          </div>
        )}

        {/* iframe preview */}
        {status === "ready" && (
          <iframe
            ref={iframeRef}
            style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
            title="Live Preview"
            allow="cross-origin-isolated; clipboard-read; clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
          />
        )}

        {/* Logs panel */}
        {showLogs && (
          <div style={{ height: 180, borderTop: "1px solid #1a1f2e", background: "#0a0e1a", overflow: "hidden", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "4px 12px", borderBottom: "1px solid #1a1f2e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.68rem", color: "#00f5ff", fontFamily: "'Orbitron',monospace" }}>Console</span>
              <button onClick={() => setLogs([])} style={{ fontSize: "0.65rem", color: "#6c7a8a", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "6px 12px" }}>
              {logs.map((l, i) => (
                <div key={i} style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "#a0aec0", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{l}</div>
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
