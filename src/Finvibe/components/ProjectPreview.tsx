import { useEffect, useRef, useState } from "react";
import sdk from "@stackblitz/sdk";
import type { CodeFile } from "../type/file";
import { fetchFileContent } from "../hooks/driveApi";

interface Props {
  projectTitle: string;
  tree: CodeFile[];
  fileCache: Map<string, string>;
  onClose: () => void;
}

// Flatten tree into { path: content } map
async function buildFileMap(
  nodes: CodeFile[],
  cache: Map<string, string>,
  base = ""
): Promise<Record<string, string>> {
  const files: Record<string, string> = {};

  async function walk(list: CodeFile[], prefix: string) {
    for (const node of list) {
      const path = prefix ? `${prefix}/${node.name}` : node.name;
      if (node.children === null || node.hasChildren === false) {
        // file
        let content = cache.get(node.id) ?? "";
        if (!content) {
          try { content = await fetchFileContent(node.id); } catch { content = ""; }
        }
        files[path] = content;
      } else if (node.children && node.children.length > 0) {
        await walk(node.children, path);
      }
    }
  }

  await walk(nodes, base);
  return files;
}

// Detect the start command from package.json scripts
function detectStartCommand(files: Record<string, string>): { cmd: string; args: string[] } {
  for (const [path, content] of Object.entries(files)) {
    if (path.endsWith("package.json") && !path.includes("node_modules")) {
      try {
        const pkg = JSON.parse(content);
        if (pkg.scripts?.dev) return { cmd: "npm", args: ["run", "dev"] };
        if (pkg.scripts?.start) return { cmd: "npm", args: ["start"] };
        if (pkg.scripts?.serve) return { cmd: "npm", args: ["run", "serve"] };
      } catch { /* ignore */ }
    }
  }
  return { cmd: "npm", args: ["start"] };
}

// Detect template type for StackBlitz
function detectTemplate(files: Record<string, string>): "node" | "create-react-app" | "angular-cli" | "html" {
  const paths = Object.keys(files);
  if (paths.some(p => p.endsWith("angular.json"))) return "angular-cli";
  if (paths.some(p => p.endsWith("index.html") && !paths.some(q => q.endsWith("package.json")))) return "html";
  return "node";
}

export default function ProjectPreview({ projectTitle, tree, fileCache, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function launch() {
      if (!containerRef.current) return;
      setStatus("loading");

      try {
        const allFiles = await buildFileMap(tree, fileCache);

        if (Object.keys(allFiles).length === 0) {
          setErrorMsg("No files found in this project.");
          setStatus("error");
          return;
        }

        // Strip the root folder prefix if all files share one
        const keys = Object.keys(allFiles);
        const rootPrefix = keys[0].split("/")[0];
        const allShareRoot = keys.every(k => k.startsWith(rootPrefix + "/"));
        const files: Record<string, string> = allShareRoot
          ? Object.fromEntries(keys.map(k => [k.slice(rootPrefix.length + 1), allFiles[k]]))
          : allFiles;

        const startCmd = detectStartCommand(files);
        const template = detectTemplate(files);

        if (cancelled) return;

        await sdk.embedProject(
          containerRef.current,
          {
            title: projectTitle,
            description: `${projectTitle} — powered by OXYBFS.AI`,
            template,
            files,
            settings: {
              compile: { trigger: "auto" },
            },
          },
          {
            openFile: Object.keys(files).find(f => f.endsWith("index.html") || f.endsWith("App.tsx") || f.endsWith("App.jsx") || f.endsWith("main.tsx")) ?? Object.keys(files)[0],
            startScript: startCmd.args.join(" "),
            hideNavigation: false,
            hideDevTools: false,
            forceEmbedLayout: true,
            height: "100%",
          }
        );

        if (!cancelled) setStatus("ready");
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err?.message ?? "Failed to launch preview.");
          setStatus("error");
        }
      }
    }

    launch();
    return () => { cancelled = true; };
  }, [projectTitle, tree, fileCache]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#020414" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid #1a1f2e", background: "rgba(0,245,255,.03)", flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#00f5ff,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>▶</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Orbitron',monospace", fontWeight: 800, fontSize: "0.8rem", background: "linear-gradient(90deg,#00f5ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Live Preview
          </div>
          <div style={{ fontSize: "0.7rem", color: "#6c7a8a", marginTop: 1 }}>{projectTitle}</div>
        </div>
        {status === "loading" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.72rem", color: "#00f5ff" }}>
            <div style={{ width: 12, height: 12, border: "2px solid #00f5ff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            Launching…
          </div>
        )}
        {status === "ready" && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "#22c55e" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            Running
          </div>
        )}
        <button
          onClick={onClose}
          style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "#a0aec0", fontSize: "0.72rem", cursor: "pointer" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.1)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.05)")}
        >
          ✕ Close
        </button>
      </div>

      {/* Preview area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {status === "error" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: "#ef4444" }}>
            <div style={{ fontSize: "2rem" }}>⚠️</div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>Preview failed</div>
            <div style={{ fontSize: "0.75rem", color: "#6c7a8a", maxWidth: 360, textAlign: "center" }}>{errorMsg}</div>
            <button
              onClick={onClose}
              style={{ marginTop: 8, padding: "7px 18px", borderRadius: 8, border: "1px solid rgba(0,245,255,.3)", background: "rgba(0,245,255,.08)", color: "#00f5ff", fontSize: "0.78rem", cursor: "pointer" }}
            >
              Go Back
            </button>
          </div>
        ) : (
          <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
