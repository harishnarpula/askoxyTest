import { useState, useEffect, useRef } from "react";
import type { CodeFile } from "../type/file";
import type { PipelineStep, GenerationResult } from "../type/types";
import { fetchProjects, fetchFileContent } from "../hooks/driveApi";
import type { LoadProgress } from "../services/autoLoadFiles";
import { loadProjectStructure } from "../services/autoLoadFiles";
import ProjectPreview from "./ProjectPreview";
import { CodeView } from "./CodeView";

type View = "titles" | "tree";

export default function CodeExplorer() {
  // --- Title-level state ---
  const [projects, setProjects] = useState<CodeFile[]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [loadingTitles, setLoadingTitles] = useState(true);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [_selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [view, setView] = useState<View>("titles");
  const [_loadProgress, setLoadProgress] = useState<LoadProgress | null>(null);

  // --- Tree / file state ---
  const [tree, setTree] = useState<CodeFile[]>([]);
  const [fullTree, setFullTree] = useState<CodeFile[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [selectedFile, setSelectedFile] = useState<CodeFile | null>(null);
  const [openFiles, setOpenFiles] = useState<CodeFile[]>([]);
  const [fileContent, setFileContent] = useState<string>("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [fileCache, setFileCache] = useState<Map<string, string>>(new Map());

  // --- Preview state ---
  const [previewKey, setPreviewKey] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // --- Search / filter ---
  const [_titleSearch, _setTitleSearch] = useState("");

  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [codeWidth, setCodeWidth] = useState(380);
  const [isResizing, setIsResizing] = useState<"sidebar" | "code" | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // --- History view state ---
  const [showHistoryView, setShowHistoryView] = useState(false);
  const [historySteps, setHistorySteps] = useState<PipelineStep[]>([]);
  const [historyResult, setHistoryResult] = useState<GenerationResult | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyProject, setHistoryProject] = useState<string>("");
  // CodeView state for history overlay
  const [historyCodeViewResult, setHistoryCodeViewResult] = useState<GenerationResult | null>(null);
  const [historyCodeTab, setHistoryCodeTab] = useState<"backend" | "frontend" | "database">("backend");
  const [showHistoryCodeView, setShowHistoryCodeView] = useState(false);
  const [highlightedTitle, setHighlightedTitle] = useState<string | null>(null);
  const [highlightHistoryHeading, setHighlightHistoryHeading] = useState(false);

  useEffect(() => {
    loadTitles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      if (isResizing === "sidebar") {
        const newWidth = e.clientX;
        if (newWidth >= 160 && newWidth <= 500) setSidebarWidth(newWidth);
      } else if (isResizing === "code" && mainContentRef.current) {
        const rect = mainContentRef.current.getBoundingClientRect();
        const newWidth = e.clientX - rect.left;
        if (newWidth >= 200 && newWidth <= rect.width - 300) setCodeWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(null);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (!highlightHistoryHeading) return;
    const timer = window.setTimeout(() => setHighlightHistoryHeading(false), 1800);
    return () => window.clearTimeout(timer);
  }, [highlightHistoryHeading]);

  // ─── Load project titles ───────────────────────────────────────
  async function loadTitles() {
    setLoadingTitles(true);
    try {
      const data = await fetchProjects();
      setProjects(data);
      const normalized: string[] = data.map((item: any) => item.name || String(item));
      setTitles(normalized);
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setLoadingTitles(false);
    }
  }

  // ─── Handle title click ───────────────────────────────────────
  async function handleTitleClick(title: string) {
    const project = projects.find((p) => p.name === title);
    if (!project) return;

    setSelectedTitle(title);
    setSelectedProjectId(project.id);
    setView("tree");
    setLoadingTree(true);
    setTree([]);
    setFullTree([]);
    setSelectedFile(null);
    setFileContent("");
    setFileCache(new Map());
    setLoadProgress(null);

    try {
      const { tree: loadedTree, fileCache: loadedCache } = await loadProjectStructure(
        project.id,
        (updatedTree) => {
          setTree(updatedTree);
          setFullTree(updatedTree);
        }
      );

      setFullTree(loadedTree);
      setTree(loadedTree);
      setFileCache(loadedCache);
    } catch (error) {
      console.error("Error loading project files:", error);
    } finally {
      setLoadingTree(false);
      setLoadProgress(null);
    }
  }

  // ─── Back to titles ───────────────────────────────────────────
  function handleBackToTitles() {
    setView("titles");
    setSelectedTitle(null);
    setSelectedProjectId(null);
    setTree([]);
    setFullTree([]);
    setSelectedFile(null);
    setOpenFiles([]);
    setFileContent("");
    setFileCache(new Map());
    setPreviewKey(0);
    setShowCode(false);
    setShowPreview(true);
    setLoadProgress(null);
  }

  // ─── Constants ────────────────────────────────────────────────
  const HARDCODED_USER_ID = "80f95ba0-6e7b-45fc-8eb1-4c1342f42d72";
  const HARDCODED_SESSION_ID = "42d82af4-fdba-45af-8e69-5c5bb730d438";
  const HISTORY_API_URL = `https://meta.oxyloans.com/api/vibecode-service/getHistoryByUserId/${HARDCODED_USER_ID}`;

  // Per-project session ID overrides (case-insensitive project name match)
  const PROJECT_SESSION_MAP: Record<string, string> = {
    "oxybank": "2cef3427-9e3d-4717-b56f-85f1751ab0d0",
    "p2p application": "1931c1f4-9da3-4887-9dfd-1eb16fbdf62b",
  };

  // Maps raw API response fields → PipelineStep[]
  const convertRawRecordToSteps = (record: any): PipelineStep[] => {
    const FIELD_MAP: { field: string; label: string; step: number }[] = [
      { step: 1,  field: "planning",     label: "Planning"           },
      { step: 2,  field: "techstack",    label: "Tech Stack"         },
      { step: 3,  field: "usecases",     label: "Use Cases"          },
      { step: 4,  field: "compliance",   label: "Compliance"         },
      { step: 5,  field: "systemdesign", label: "System Design"      },
      { step: 6,  field: "structure",    label: "Folder Structure"   },
      { step: 7,  field: "prompt",       label: "Prompt Builder"     },
      { step: 8,  field: "backend",      label: "Backend Generation" },
      { step: 9,  field: "frontend",     label: "Frontend Generation"},
      { step: 10, field: "database",     label: "Database Generation"},
    ];

    // Derive which step stopped from stepStatus e.g. "STEP_9_STOPPED"
    const stoppedAt = (() => {
      const m = String(record.stepStatus ?? "").match(/STEP_(\d+)/i);
      return m ? parseInt(m[1], 10) : 999;
    })();

    return FIELD_MAP.map(({ step, field, label }) => {
      const raw = record[field];
      const hasData = raw !== null && raw !== undefined && raw !== "";
      let parsed: any = raw;
      if (hasData && typeof raw === "string") {
        try { parsed = JSON.parse(raw); } catch { parsed = raw; }
      }
      const status: PipelineStep["status"] =
        step < stoppedAt && hasData  ? "completed"
        : step === stoppedAt         ? "error"
        : "idle";
      return { step, label, status, data: parsed };
    });
  };

  // ─── Handle Explore 12 Steps ──────────────────────────────────
  const handleExplore12Steps = async (projectName: string) => {
    setHighlightedTitle(projectName);
    setHighlightHistoryHeading(true);
    setHistoryLoading(true);
    setHistoryError("");
    setShowHistoryView(false);
    setShowHistoryCodeView(false);
    try {
      const response = await fetch(HISTORY_API_URL, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const dataArr = await response.json() as any[];
      // Use per-project session ID if available, fall back to default
      const projectKey = projectName.trim().toLowerCase();
      const sessionId = PROJECT_SESSION_MAP[projectKey] ?? HARDCODED_SESSION_ID;

      // Filter by the resolved session ID
      const record = Array.isArray(dataArr)
        ? dataArr.find((r: any) => r.sessionId === sessionId)
        : null;

      if (!record) throw new Error(`No record found for session ${sessionId}`);

      setHistoryProject(projectName || record.userPrompt || "Project History");
      const steps = convertRawRecordToSteps(record);
      setHistorySteps(steps);

      // Build GenerationResult if backend/frontend/database arrays exist
      const mkFiles = (arr: any[]) =>
        Array.isArray(arr)
          ? arr.map((f: any, i: number) => ({ path: f.path ?? f.name ?? `file_${i}`, content: f.content ?? "" }))
          : [];
      const genResult: GenerationResult = {
        backend:  mkFiles(record.backend  ?? []),
        frontend: mkFiles(record.frontend ?? []),
        database: mkFiles(record.database ?? []),
      };
      const hasFiles =
        genResult.backend.length + genResult.frontend.length + genResult.database.length > 0;
      setHistoryResult(hasFiles ? genResult : null);

      setShowHistoryView(true);
    } catch (err: any) {
      setHistoryError(err?.message ?? "Failed to load history");
      setShowHistoryView(true); // show overlay with error
    } finally {
      setHistoryLoading(false);
    }
  };

  async function handleFileClick(file: CodeFile) {
    if (!openFiles.find((f) => f.id === file.id)) {
      setOpenFiles((prev) => [...prev, file]);
    }
    setSelectedFile(file);
    setShowCode(true); // auto-show code panel when file selected

    const cached = fileCache.get(file.id);
    if (cached) {
      setFileContent(cached);
      return;
    }

    setLoadingContent(true);
    try {
      const content = await fetchFileContent(file.id);
      setFileContent(content);
      setFileCache((prev) => new Map(prev).set(file.id, content));
    } catch (error) {
      console.error("Error loading file content:", error);
      setFileContent("Error loading file content");
    } finally {
      setLoadingContent(false);
    }
  }

  function handleCloseFile(fileId: string, e?: React.MouseEvent) {
    e?.stopPropagation();

    const fileIndex = openFiles.findIndex((f) => f.id === fileId);
    const newOpenFiles = openFiles.filter((f) => f.id !== fileId);
    setOpenFiles(newOpenFiles);

    if (selectedFile?.id === fileId) {
      if (newOpenFiles.length > 0) {
        const newIndex = fileIndex > 0 ? fileIndex - 1 : 0;
        const newSelectedFile = newOpenFiles[newIndex];
        setSelectedFile(newSelectedFile);
        const content = fileCache.get(newSelectedFile.id);
        if (content) setFileContent(content);
      } else {
        setSelectedFile(null);
        setFileContent("");
      }
    }
  }

  function handleTabClick(file: CodeFile) {
    setSelectedFile(file);
    const content = fileCache.get(file.id);
    if (content) setFileContent(content);
  }

  function collectAllFiles(nodes: CodeFile[]): CodeFile[] {
    const files: CodeFile[] = [];

    function traverse(node: CodeFile) {
      const isFolder =
        node.hasChildren === true ||
        (Array.isArray(node.children) && node.children.length > 0) ||
        node.mimeType === "folder" ||
        node.type === "folder";

      if (isFolder && Array.isArray(node.children)) {
        node.children.forEach((child) => traverse(child));
      } else if (!isFolder) {
        files.push(node);
      }
    }

    nodes.forEach((node) => traverse(node));
    return files;
  }

  const filteredTitles = titles.filter((t) =>
    String(t).toLowerCase().includes(_titleSearch.toLowerCase())
  );

  // ─── RENDER ────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#020414]" style={{ fontFamily: "'Sora',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;800;900&family=Sora:wght@300;400;500;600&display=swap');
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes pulseGlow { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>

      {/* ── Sidebar ── */}
      {view === "tree" && (
        <div
          id="sidebar-container"
          className="bg-[#0a0e1a] border-r border-[#1a1f2e] flex flex-col relative"
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 border-b border-[#1a1f2e]"
            style={{ background: "rgba(0,245,255,.03)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#00f5ff,#7c3aed)" }}
              >
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h1
                  style={{
                    fontFamily: "'Orbitron',monospace",
                    fontWeight: 800,
                    fontSize: "0.85rem",
                    background: "linear-gradient(90deg,#00f5ff,#a855f7)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  OXYBFS.AI
                </h1>
                <p className="text-[#6c7a8a] text-[10px] font-medium mt-0.5">{selectedTitle}</p>
              </div>
            </div>


          </div>

          {/* Back button */}
          <div className="p-2 border-b border-[#1a1f2e]" style={{ background: "rgba(0,0,0,.2)" }}>
            <button
              onClick={handleBackToTitles}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium text-[#a0aec0] hover:bg-[#1a1f2e] transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              All Projects
            </button>
          </div>

          {/* Panel toggle buttons */}
          <div className="px-2 py-2 border-b border-[#1a1f2e] flex gap-1.5" style={{ background: "rgba(0,0,0,.15)" }}>
            <button
              onClick={() => setShowCode((v) => !v)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[11px] font-medium transition-all"
              style={{
                background: showCode ? "rgba(0,245,255,.1)" : "rgba(255,255,255,.03)",
                border: `1px solid ${showCode ? "rgba(0,245,255,.35)" : "rgba(255,255,255,.07)"}`,
                color: showCode ? "#00f5ff" : "#6c7a8a",
              }}
            >
              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              {showCode ? "Hide Code" : "Show Code"}
            </button>
            <button
              onClick={() => setShowPreview((v) => !v)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[11px] font-medium transition-all"
              style={{
                background: showPreview ? "rgba(0,245,255,.1)" : "rgba(255,255,255,.03)",
                border: `1px solid ${showPreview ? "rgba(0,245,255,.35)" : "rgba(255,255,255,.07)"}`,
                color: showPreview ? "#00f5ff" : "#6c7a8a",
              }}
            >
              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              {showPreview ? "Hide Preview" : "Show Preview"}
            </button>
          </div>

          {/* File tree */}
          <div
            className="flex-1 overflow-y-auto p-2"
            style={{ background: "rgba(0,0,0,.15)" }}
          >
            {loadingTree && tree.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2.5">
                <div className="w-8 h-8 border-2 border-[#1a1f2e] border-t-[#00f5ff] rounded-full animate-spin"></div>
                <p className="text-[#6c7a8a] font-medium text-[10px]">Loading project...</p>
                <p className="text-[#00f5ff] text-[10px]">{selectedTitle}</p>
              </div>
            ) : tree.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <div className="w-10 h-10 bg-[#1a1f2e] rounded flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-[#6c7a8a]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                </div>
                <p className="text-[#6c7a8a] text-[10px]">No files found</p>
              </div>
            ) : (
              <>
                {/* File count badge */}
                <div
                  className="mb-2 px-2 py-1 rounded text-[9px] font-semibold"
                  style={{
                    background: "rgba(0,245,255,.05)",
                    color: "#00f5ff",
                    border: "1px solid rgba(0,245,255,.2)",
                  }}
                >
                  {collectAllFiles(tree).length} files in project
                </div>
                <FileTreeView
                  nodes={tree}
                  onFileClick={handleFileClick}
                  selectedFile={selectedFile}
                  autoExpandTitles={selectedTitle ? [selectedTitle] : []}
                />
              </>
            )}
          </div>

          {/* Sidebar resize handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#00f5ff] transition-colors"
            onMouseDown={() => setIsResizing("sidebar")}
          />
        </div>
      )}

      {/* ── Main Content ── */}
      <div
        ref={mainContentRef}
        id="main-content"
        className="flex-1 flex overflow-hidden"
        style={{ background: "#020414" }}
      >
        {view === "tree" ? (
          <>
            {/* Code panel — only rendered when showCode is true */}
            {showCode && (
              <div
                className="flex flex-col overflow-hidden flex-shrink-0"
                style={{ width: !showPreview ? "100%" : `${codeWidth}px`, minWidth: 0 }}
              >
                {selectedFile ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Tab Bar */}
                    {openFiles.length > 0 && (
                      <div
                        className="flex items-center border-b border-[#1a1f2e] overflow-x-auto flex-shrink-0"
                        style={{ background: "rgba(0,0,0,.2)", scrollbarWidth: "thin" }}
                      >
                        {openFiles.map((file) => {
                          const isActive = selectedFile?.id === file.id;
                          return (
                            <div
                              key={file.id}
                              onClick={() => handleTabClick(file)}
                              className="flex items-center gap-2 px-3 py-2 border-r border-[#1a1f2e] cursor-pointer transition-colors group relative"
                              style={{
                                background: isActive ? "rgba(0,245,255,.05)" : "transparent",
                                borderBottom: isActive
                                  ? "2px solid #00f5ff"
                                  : "2px solid transparent",
                                minWidth: "120px",
                                maxWidth: "200px",
                              }}
                              onMouseEnter={(e) => {
                                if (!isActive)
                                  e.currentTarget.style.background = "rgba(255,255,255,.02)";
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive) e.currentTarget.style.background = "transparent";
                              }}
                            >
                              <span className="flex-shrink-0">{getFileIcon(file.name)}</span>
                              <span
                                className="flex-1 text-xs font-medium truncate"
                                style={{ color: isActive ? "#00f5ff" : "#a0aec0" }}
                              >
                                {file.name}
                              </span>
                              <button
                                onClick={(e) => handleCloseFile(file.id, e)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[#1a1f2e]"
                                title="Close"
                              >
                                <svg
                                  className="w-3 h-3"
                                  style={{ color: isActive ? "#00f5ff" : "#6c7a8a" }}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* File Header */}
                    <div
                      className="border-b border-[#1a1f2e] px-4 py-2 flex-shrink-0"
                      style={{ background: "rgba(0,245,255,.03)" }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex-shrink-0">{getFileIcon(selectedFile.name)}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h2
                              className="text-white font-semibold text-xs"
                              style={{ fontFamily: "'Orbitron',monospace" }}
                            >
                              {selectedFile.name}
                            </h2>
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                              style={{ background: "rgba(0,245,255,.1)", color: "#00f5ff" }}
                            >
                              {getLanguageLabel(selectedFile.name)}
                            </span>
                          </div>
                          <p className="text-[#6c7a8a] text-[9px] font-medium mt-0.5">
                            {getFilePath(selectedFile, tree)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowCode(false)}
                            className="px-2 py-1 rounded text-[10px] font-medium transition-colors"
                            style={{ background: "rgba(255,255,255,.05)", color: "#6c7a8a", border: "1px solid rgba(255,255,255,.1)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.1)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.05)")}
                            title="Hide Code"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                          </button>
                          {!showPreview && (
                            <button
                              onClick={() => setShowPreview(true)}
                              className="px-2 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1"
                              style={{ background: "rgba(0,245,255,.08)", color: "#00f5ff", border: "1px solid rgba(0,245,255,.3)" }}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                              Preview
                            </button>
                          )}
                          <button
                            onClick={() => navigator.clipboard.writeText(fileContent)}
                            className="px-2.5 py-1 text-white rounded text-[10px] font-medium transition-colors flex items-center gap-1"
                            style={{
                              background:
                                "linear-gradient(135deg,rgba(0,245,255,.18),rgba(124,58,237,.12))",
                              border: "1px solid rgba(0,245,255,.3)",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                "linear-gradient(135deg,rgba(0,245,255,.28),rgba(124,58,237,.2))")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background =
                                "linear-gradient(135deg,rgba(0,245,255,.18),rgba(124,58,237,.12))")
                            }
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                            Copy
                          </button>
                          <button
                            onClick={(e) => handleCloseFile(selectedFile.id, e)}
                            className="px-2 py-1 rounded text-[10px] font-medium transition-colors"
                            style={{
                              background: "rgba(255,255,255,.05)",
                              color: "#a0aec0",
                              border: "1px solid rgba(255,255,255,.1)",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "rgba(255,255,255,.1)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "rgba(255,255,255,.05)")
                            }
                            title="Close File"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Code viewer */}
                    <div className="flex-1 overflow-hidden" style={{ background: "#0a0e1a" }}>
                      {loadingContent ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="w-8 h-8 border-2 border-[#1a1f2e] border-t-[#00f5ff] rounded-full animate-spin mb-2.5"></div>
                            <p className="text-[#6c7a8a] font-medium text-[10px]">
                              Loading file...
                            </p>
                          </div>
                        </div>
                      ) : (
                        <CodeBlock code={fileContent} fileName={selectedFile.name} />
                      )}
                    </div>

                    {/* Status Bar */}
                    <div
                      className="flex items-center justify-between px-4 py-1 border-t border-[#1a1f2e] text-[10px] flex-shrink-0"
                      style={{ background: "rgba(0,0,0,.3)" }}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-[#6c7a8a]">
                          <span className="text-[#00f5ff] font-semibold">
                            {getLanguageLabel(selectedFile.name)}
                          </span>
                        </span>
                        <span className="text-[#6c7a8a]">
                          {fileContent.split("\n").length} lines
                        </span>
                        <span className="text-[#6c7a8a]">{fileContent.length} characters</span>
                        <span className="text-[#6c7a8a]">UTF-8</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[#6c7a8a]">
                          {openFiles.length} file{openFiles.length !== 1 ? "s" : ""} open
                        </span>
                        <span
                          className="text-[#00f5ff] font-semibold"
                          style={{ fontFamily: "'Orbitron',monospace" }}
                        >
                          OXYBFS.AI
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* No file selected placeholder */
                  <div
                    className="flex-1 flex items-center justify-center"
                    style={{ background: "#020414" }}
                  >
                    <div className="text-center">
                      <div
                        className="w-16 h-16 rounded flex items-center justify-center mx-auto mb-3"
                        style={{
                          background: "rgba(0,245,255,.05)",
                          border: "1px solid rgba(0,245,255,.2)",
                        }}
                      >
                        <svg
                          className="w-8 h-8 text-[#00f5ff]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                          />
                        </svg>
                      </div>
                      <h2
                        className="text-sm font-semibold text-white mb-1"
                        style={{ fontFamily: "'Orbitron',monospace" }}
                      >
                        Select a File
                      </h2>
                      <p className="text-[#6c7a8a] text-xs">
                        Choose from{" "}
                        <span className="font-semibold text-[#00f5ff]">{selectedTitle}</span> to
                        view code
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Resizer - code/preview */}
            {showCode && showPreview && (
              <div
                className="w-1 bg-transparent hover:bg-[#00f5ff] cursor-col-resize transition-colors relative flex-shrink-0"
                onMouseDown={() => setIsResizing("code")}
              >
                <div className="absolute inset-0 w-3 -left-1" />
              </div>
            )}

            {/* Preview panel — always mounted to preserve WebContainer state */}
            <div
              className="flex flex-col overflow-hidden flex-1"
              style={{ minWidth: 0, display: showPreview ? "flex" : "none" }}
            >
              {!loadingTree && tree.length > 0 ? (
                <ProjectPreview
                  key={previewKey}
                  projectTitle={selectedTitle ?? ""}
                  tree={fullTree.length > 0 ? fullTree : tree}
                  fileCache={fileCache}
                  onClose={() => setPreviewKey((k) => k + 1)}
                  onTogglePreview={() => setShowPreview(false)}
                  showCode={showCode}
                  onToggleCode={() => setShowCode((v) => !v)}
                />
              ) : (
                <div
                  className="flex-1 flex items-center justify-center"
                  style={{ background: "#020414" }}
                >
                  <div className="text-center">
                    <div className="w-10 h-10 border-2 border-[#1a1f2e] border-t-[#00f5ff] rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-[#6c7a8a] text-xs">Loading Preview...</p>
                  </div>
                </div>
              )}
            </div>

            {/* All panels hidden fallback */}
            {!showCode && !showPreview && (
              <div
                className="flex-1 flex items-center justify-center"
                style={{ background: "#020414" }}
              >
                <div className="text-center">
                  <p className="text-[#6c7a8a] text-xs mb-3">All panels are hidden.</p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => setShowCode(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
                      style={{ background: "rgba(0,245,255,.1)", border: "1px solid rgba(0,245,255,.3)", color: "#00f5ff" }}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                      Show Code
                    </button>
                    <button
                      onClick={() => setShowPreview(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
                      style={{ background: "rgba(0,245,255,.1)", border: "1px solid rgba(0,245,255,.3)", color: "#00f5ff" }}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                      Show Preview
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : view === "titles" ? (
          <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#020414" }}>
            {/* Header */}
            <div
              className="border-b border-[#1a1f2e] px-6 py-4"
              style={{ background: "rgba(0,245,255,.03)" }}
            >
              <h2
                className="text-2xl font-bold text-white mb-1"
                style={{ fontFamily: "'Orbitron',monospace" }}
              >
                Projects
              </h2>
              <p className="text-[#6c7a8a] text-sm">Select a project to explore and run</p>
            </div>

            {/* Projects Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingTitles ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-12 h-12 border-2 border-[#1a1f2e] border-t-[#00f5ff] rounded-full animate-spin mb-3"></div>
                    <p className="text-[#6c7a8a] font-medium text-sm">Loading projects...</p>
                  </div>
                </div>
              ) : filteredTitles.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-[#1a1f2e] rounded-lg flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-[#6c7a8a]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                    </div>
                    <p className="text-[#6c7a8a] text-sm">No projects found</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTitles.map((title, idx) => (
                    <div
                      key={idx}
                      className="group rounded-lg p-7 hover:shadow-lg transition-all duration-200"
                      style={{
                        background: "rgba(255,255,255,.03)",
                        border: "1px solid rgba(255,255,255,.06)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "rgba(0,245,255,.3)";
                        e.currentTarget.style.boxShadow = "0 0 24px rgba(0,245,255,.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,.06)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                          style={{ background: "linear-gradient(135deg,#00f5ff,#7c3aed)" }}
                        >
                          <span className="text-white font-bold text-2xl">
                            {title.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className="text-white font-semibold text-base mb-1 truncate group-hover:text-[#00f5ff] transition-colors"
                            style={{
                              fontFamily: "'Orbitron',monospace",
                              color: highlightedTitle === title ? "#00f5ff" : undefined,
                            }}
                          >
                            {title}
                          </h3>
                          <p className="text-[#6c7a8a] text-xs">Project Folder</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Explore Project button */}
                        <button
                          onClick={() => handleTitleClick(title)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded border group/epbtn"
                          style={{
                            borderColor: "rgba(255,255,255,.07)",
                            background: "rgba(255,255,255,.02)",
                            transition: "all 0.22s ease",
                            cursor: "pointer",
                            position: "relative",
                            overflow: "hidden",
                          }}
                          onMouseEnter={(e) => {
                            const btn = e.currentTarget;
                            btn.style.background = "rgba(255,255,255,.07)";
                            btn.style.borderColor = "rgba(255,255,255,.2)";
                            btn.style.transform = "translateY(-1px)";
                            btn.style.boxShadow = "0 4px 16px rgba(0,0,0,.3)";
                            const span = btn.querySelector(".ep-label") as HTMLElement;
                            if (span) span.style.color = "#e2e8f0";
                            const arrow = btn.querySelector(".ep-arrow") as HTMLElement;
                            if (arrow) { arrow.style.transform = "translateX(3px)"; arrow.style.color = "#00f5ff"; }
                          }}
                          onMouseLeave={(e) => {
                            const btn = e.currentTarget;
                            btn.style.background = "rgba(255,255,255,.02)";
                            btn.style.borderColor = "rgba(255,255,255,.07)";
                            btn.style.transform = "translateY(0)";
                            btn.style.boxShadow = "none";
                            const span = btn.querySelector(".ep-label") as HTMLElement;
                            if (span) span.style.color = "#6c7a8a";
                            const arrow = btn.querySelector(".ep-arrow") as HTMLElement;
                            if (arrow) { arrow.style.transform = "translateX(0)"; arrow.style.color = "#6c7a8a"; }
                          }}
                        >
                          <span
                            className="ep-label text-xs font-medium"
                            style={{ color: "#6c7a8a", transition: "color 0.22s ease" }}
                          >
                            Explore Project
                          </span>
                          <svg
                            className="ep-arrow w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            style={{ color: "#6c7a8a", transition: "transform 0.22s ease, color 0.22s ease", flexShrink: 0 }}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>

                        {/* Explore Steps button */}
                        <button
                          onClick={() => handleExplore12Steps(title)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded border text-xs"
                          style={{
                            borderColor: "rgba(0,245,255,.3)",
                            background: "rgba(0,245,255,.07)",
                            color: "#00f5ff",
                            cursor: "pointer",
                            transition: "all 0.22s ease",
                            position: "relative",
                            overflow: "hidden",
                          }}
                          onMouseEnter={(e) => {
                            const btn = e.currentTarget;
                            btn.style.background = "rgba(0,245,255,.18)";
                            btn.style.borderColor = "rgba(0,245,255,.6)";
                            btn.style.boxShadow = "0 0 20px rgba(0,245,255,.25), 0 4px 16px rgba(0,245,255,.1)";
                            btn.style.transform = "translateY(-1px)";
                            btn.style.color = "#fff";
                            const icon = btn.querySelector(".es-icon") as HTMLElement;
                            if (icon) { icon.style.transform = "scale(1.2) rotate(-10deg)"; icon.style.filter = "drop-shadow(0 0 4px #00f5ff)"; }
                          }}
                          onMouseLeave={(e) => {
                            const btn = e.currentTarget;
                            btn.style.background = "rgba(0,245,255,.07)";
                            btn.style.borderColor = "rgba(0,245,255,.3)";
                            btn.style.boxShadow = "none";
                            btn.style.transform = "translateY(0)";
                            btn.style.color = "#00f5ff";
                            const icon = btn.querySelector(".es-icon") as HTMLElement;
                            if (icon) { icon.style.transform = "scale(1) rotate(0deg)"; icon.style.filter = "none"; }
                          }}
                        >
                          <svg
                            className="es-icon w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            style={{ transition: "transform 0.22s ease, filter 0.22s ease", flexShrink: 0 }}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="font-semibold" style={{ transition: "color 0.22s ease" }}>Explore Steps</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Stats */}
            {!loadingTitles && titles.length > 0 && (
              <div
                className="border-t border-[#1a1f2e] px-6 py-3"
                style={{ background: "rgba(0,0,0,.2)" }}
              >
                <p className="text-xs text-[#6c7a8a] text-center">
                  Showing {filteredTitles.length} of {titles.length} project
                  {titles.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* ── History / Pipeline Overlay ── */}
      {showHistoryView && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#020414", fontFamily: "'Sora',sans-serif" }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-[#1a1f2e]" style={{ background: "rgba(0,245,255,.03)", flexShrink: 0 }}>
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg,#00f5ff,#7c3aed)" }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2
                style={{
                  fontFamily: "'Orbitron',monospace",
                  fontWeight: 800,
                  fontSize: "0.85rem",
                  display: "inline-block",
                  color: highlightHistoryHeading ? "#c8f3ff" : "#9ed8e8",
                  letterSpacing: highlightHistoryHeading ? "0.045em" : "0.02em",
                  transition: "all 0.22s ease",
                }}
              >
                Explore Steps
              </h2>
              <p className="text-[#6c7a8a] text-[10px] mt-0.5">{historyProject}</p>
            </div>
            {/* Code view toggle */}
            {historyResult && (
              <button
                onClick={() => { setHistoryCodeViewResult(historyResult); setShowHistoryCodeView(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold"
                style={{ background: "linear-gradient(135deg,rgba(0,245,255,.18),rgba(124,58,237,.12))", border: "1px solid rgba(0,245,255,.3)", color: "#00f5ff" }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                View Code
              </button>
            )}
            <button
              onClick={() => { setShowHistoryView(false); setShowHistoryCodeView(false); }}
              className="px-3 py-1.5 rounded text-xs font-medium"
              style={{ background: "rgba(255,255,255,.05)", color: "#a0aec0", border: "1px solid rgba(255,255,255,.1)" }}
            >
              ✕ Close
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden flex">
            {/* Pipeline feed column */}
            <div className={`flex flex-col overflow-hidden ${showHistoryCodeView ? "w-[42%] border-r border-[#1a1f2e]" : "flex-1"}`}>
              {historyLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-10 h-10 border-2 border-[#1a1f2e] border-t-[#00f5ff] rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-[#6c7a8a] text-xs">Fetching pipeline history…</p>
                  </div>
                </div>
              ) : historyError && historySteps.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center px-8">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)" }}>
                      <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </div>
                    <p className="text-red-400 text-sm font-medium mb-1">Failed to load history</p>
                    <p className="text-[#6c7a8a] text-xs">{historyError}</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: "thin", background: "#020414" }}>
                  <div className="max-w-2xl mx-auto space-y-4">
                    {/* Prompt card */}
                    <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "#c4c8f8" }}>
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 block mb-1">User Prompt</span>
                      {historyProject}
                    </div>
                    {/* Steps */}
                    {historySteps.map((step, idx) => {
                      const isLast = idx === historySteps.length - 1;
                      const COLORS: Record<string, string> = {
                        "Planning": "#3B82F6", "Clarification": "#F59E0B", "Tech Stack": "#8B5CF6",
                        "Use Cases": "#06B6D4", "Compliance": "#F59E0B", "System Design": "#F97316",
                        "Folder Structure": "#14B8A6", "Prompt Builder": "#EC4899",
                        "Backend Generation": "#10B981", "Frontend Generation": "#A78BFA", "Database Generation": "#38BDF8",
                      };
                      const ICONS: Record<string, string> = {
                        "Planning": "🔍", "Clarification": "❓", "Tech Stack": "🛠️",
                        "Use Cases": "📋", "Compliance": "📜", "System Design": "🏗️",
                        "Folder Structure": "📁", "Prompt Builder": "✍️",
                        "Backend Generation": "⚙️", "Frontend Generation": "🎨", "Database Generation": "🗄️",
                      };
                      const accent = COLORS[step.label] ?? "#6B7A99";
                      const isDone = step.status === "completed";
                      const isErr  = step.status === "error";
                      return (
                        <div key={step.step} className="flex gap-3">
                          {/* timeline */}
                          <div className="flex flex-col items-center w-7 shrink-0">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                              style={{ background: isDone ? `${accent}14` : isErr ? "rgba(239,68,68,.1)" : "rgba(255,255,255,.04)", border: isDone ? `1px solid ${accent}32` : isErr ? "1px solid rgba(239,68,68,.3)" : "1px solid rgba(255,255,255,.08)" }}>
                              {isDone ? (
                                <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              ) : isErr ? (
                                <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1 1l7 7M8 1L1 8" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round"/></svg>
                              ) : (
                                <span style={{ fontSize: 11 }}>{ICONS[step.label] ?? "▸"}</span>
                              )}
                            </div>
                            {!isLast && <div className="w-px flex-1 mt-1.5" style={{ background: isDone ? `linear-gradient(to bottom,${accent}2A,rgba(255,255,255,.04))` : "rgba(255,255,255,.04)", minHeight: 14 }} />}
                          </div>
                          {/* card */}
                          <ExpandableStepCard step={step} accent={accent} isDone={isDone} isErr={isErr} icon={ICONS[step.label] ?? "▸"} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Code View panel */}
            {showHistoryCodeView && historyCodeViewResult && (
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Tab bar */}
                <div className="flex items-center gap-1 px-3 py-2 border-b border-[#1a1f2e]" style={{ background: "rgba(0,0,0,.2)", flexShrink: 0 }}>
                  {(["backend", "frontend", "database"] as const).map(tab => (
                    <button key={tab}
                      onClick={() => setHistoryCodeTab(tab)}
                      className="px-3 py-1.5 rounded text-xs font-medium capitalize transition-all"
                      style={{ background: historyCodeTab === tab ? "rgba(0,245,255,.1)" : "transparent", color: historyCodeTab === tab ? "#00f5ff" : "#6c7a8a", border: historyCodeTab === tab ? "1px solid rgba(0,245,255,.3)" : "1px solid transparent" }}>
                      {tab} ({historyCodeViewResult[tab].length})
                    </button>
                  ))}
                  <button onClick={() => setShowHistoryCodeView(false)} className="ml-auto px-2 py-1 rounded text-[10px]" style={{ color: "#6c7a8a" }}>✕</button>
                </div>
                <CodeView
                  result={historyCodeViewResult}
                  defaultTab={historyCodeTab}
                  onBack={() => setShowHistoryCodeView(false)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

interface FileTreeViewProps {
  nodes: CodeFile[];
  onFileClick: (file: CodeFile) => void;
  selectedFile: CodeFile | null;
  level?: number;
  autoExpandTitles?: string[];
}

// ─── Expandable Step Card (for history overlay) ────────────────


// Helper: recursively render any value into readable JSX
function renderValue(val: unknown, accent: string, depth = 0): React.ReactNode {
  if (val === null || val === undefined) return <span style={{ color: "#6c7a8a" }}>—</span>;
  if (typeof val === "boolean") return <span style={{ color: val ? "#10B981" : "#ef4444" }}>{String(val)}</span>;
  if (typeof val === "number")  return <span style={{ color: "#F59E0B" }}>{val}</span>;

  if (typeof val === "string") {
    if (val.length > 300) {
      return (
        <pre className="whitespace-pre-wrap break-all font-mono text-[11px] max-h-48 overflow-y-auto leading-relaxed"
          style={{ color: "#a0aec0", scrollbarWidth: "thin" }}>
          {val}
        </pre>
      );
    }
    return <span style={{ color: "#e2e8f0", fontSize: 11 }}>{val}</span>;
  }

  if (Array.isArray(val)) {
    if (val.length === 0) return <span style={{ color: "#6c7a8a", fontSize: 11 }}>[ empty ]</span>;
    return (
      <div className="space-y-1.5 mt-1">
        {val.slice(0, 30).map((item, i) => (
          <div key={i} className="pl-3 py-1.5 rounded-lg" style={{ borderLeft: `2px solid ${accent}50`, background: "rgba(255,255,255,.02)" }}>
            {renderValue(item, accent, depth + 1)}
          </div>
        ))}
        {val.length > 30 && (
          <span className="text-[10px] pl-2" style={{ color: `${accent}88` }}>+{val.length - 30} more items…</span>
        )}
      </div>
    );
  }

  if (typeof val === "object" && val !== null) {
    // At deep nesting (depth >= 3) fall back to JSON to avoid infinite height
    if (depth >= 3) {
      return (
        <pre className="whitespace-pre-wrap break-all font-mono text-[10px] max-h-32 overflow-y-auto"
          style={{ color: "#a0aec0", scrollbarWidth: "thin" }}>
          {JSON.stringify(val, null, 2)}
        </pre>
      );
    }
    const entries = Object.entries(val as Record<string, unknown>);
    return (
      <div className="space-y-2">
        {entries.map(([k, v]) => (
          <div key={k}>
            <span
              className="text-[10px] font-bold uppercase tracking-widest block mb-1"
              style={{
                color: "#cce6ef",
                background: `linear-gradient(90deg, ${accent}1f, rgba(255,255,255,0.015))`,
                border: `1px solid ${accent}44`,
                borderRadius: 8,
                padding: "2px 8px",
                display: "inline-block",
                letterSpacing: "0.09em",
              }}
            >
              {k}
            </span>
            <div style={{ paddingLeft: 8 }}>
              {renderValue(v, accent, depth + 1)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <span style={{ color: "#e2e8f0", fontSize: 11 }}>{String(val)}</span>;
}

function StepDataRenderer({ data, accent }: { data: unknown; accent: string }) {
  if (data === null || data === undefined) return null;

  /* Top-level string */
  if (typeof data === "string") {
    return (
      <pre className="text-[11px] font-mono whitespace-pre-wrap break-all leading-relaxed max-h-64 overflow-y-auto px-4 py-3 rounded-xl"
        style={{ background: "rgba(0,0,0,.3)", color: "#a0aec0", border: `1px solid ${accent}18`, scrollbarWidth: "thin" }}>
        {data}
      </pre>
    );
  }

  /* Top-level array */
  if (Array.isArray(data)) {
    return (
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
        {data.map((item, i) => (
          <div key={i} className="px-3 py-2 rounded-lg" style={{ background: "rgba(0,0,0,.25)", border: `1px solid ${accent}14` }}>
            {renderValue(item, accent, 1)}
          </div>
        ))}
      </div>
    );
  }

  /* Top-level object — show key/value sections */
  if (typeof data === "object" && data !== null) {
    const entries = Object.entries(data as Record<string, unknown>);
    return (
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
        {entries.map(([key, val]) => (
          <div key={key}>
            <span
              className="text-[10px] font-bold uppercase tracking-widest block mb-1.5"
              style={{
                color: "#d8edf6",
                background: `linear-gradient(90deg, ${accent}24, rgba(255,255,255,0.02))`,
                border: `1px solid ${accent}48`,
                borderRadius: 8,
                padding: "3px 9px",
                display: "inline-block",
                letterSpacing: "0.1em",
              }}
            >
              {key}
            </span>
            <div className="px-3 py-2 rounded-lg" style={{ background: "rgba(0,0,0,.25)", border: `1px solid ${accent}14` }}>
              {renderValue(val, accent, 1)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-[11px]" style={{ color: "#a0aec0" }}>{String(data)}</span>;
}

function ExpandableStepCard({
  step, accent, isDone, isErr, icon
}: {
  step: PipelineStep;
  accent: string;
  isDone: boolean;
  isErr: boolean;
  icon: string;
}) {
  const hasContent = isDone && step.data !== null && step.data !== undefined;

  return (
    <div className="flex-1 rounded-2xl overflow-hidden mb-1.5"
      style={{ background: isDone ? "rgba(255,255,255,.02)" : isErr ? "rgba(239,68,68,.04)" : "transparent", border: isDone ? `1px solid ${accent}18` : isErr ? "1px solid rgba(239,68,68,.2)" : "1px solid transparent" }}>
      {/* Header row */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span
          className="font-semibold"
          style={{
            fontSize: "0.88rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            padding: "3px 10px",
            borderRadius: 8,
            border: isDone
              ? `1px solid ${accent}4a`
              : isErr
              ? "1px solid rgba(239,68,68,.42)"
              : "1px solid rgba(255,255,255,.16)",
            color: isDone ? "#d8e7ee" : isErr ? "#f7caca" : "rgba(255,255,255,.72)",
            background: isDone
              ? `linear-gradient(90deg, ${accent}24, rgba(255,255,255,0.03))`
              : isErr
              ? "linear-gradient(90deg, rgba(239,68,68,.16), rgba(255,255,255,0.03))"
              : "linear-gradient(90deg, rgba(255,255,255,.1), rgba(255,255,255,0.02))",
          }}
        >
          {step.label}
        </span>
        <div className="ml-auto">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: isDone ? `${accent}18` : isErr ? "rgba(239,68,68,.15)" : "rgba(255,255,255,.05)", color: isDone ? accent : isErr ? "#ef4444" : "rgba(255,255,255,.3)" }}>
            {isDone ? "Done" : isErr ? "Stopped" : "Pending"}
          </span>
        </div>
      </div>
      {/* Always-visible content */}
      {hasContent && (
        <div className="px-4 pb-4" style={{ borderTop: `1px solid ${accent}14` }}>
          <div className="pt-3">
            <StepDataRenderer data={step.data} accent={accent} />
          </div>
        </div>
      )}
    </div>
  );
}

function FileTreeView({
  nodes,
  onFileClick,
  selectedFile,
  level = 0,
  autoExpandTitles,
}: FileTreeViewProps) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          onFileClick={onFileClick}
          selectedFile={selectedFile}
          level={level}
          autoExpand={
            autoExpandTitles?.some((t) => t.toLowerCase() === node.name.toLowerCase()) ?? false
          }
          autoExpandTitles={autoExpandTitles}
        />
      ))}
    </div>
  );
}

interface TreeNodeProps {
  node: CodeFile;
  onFileClick: (file: CodeFile) => void;
  selectedFile: CodeFile | null;
  level: number;
  autoExpand?: boolean;
  autoExpandTitles?: string[];
}

function TreeNode({
  node,
  onFileClick,
  selectedFile,
  level,
  autoExpand = false,
  autoExpandTitles,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(autoExpand);

  // FIX: consistent folder detection — matches collectAllFiles logic exactly
  const isFolder =
    node.hasChildren === true ||
    (Array.isArray(node.children) && node.children.length > 0) ||
    node.mimeType === "folder" ||
    node.type === "folder";

  const isSelected = selectedFile?.id === node.id;
  const isLoading = node.isLoading;

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition-colors ${
          isSelected ? "bg-[#1a1f2e] text-white" : "hover:bg-[#1a1f2e] text-[#a0aec0]"
        }`}
        style={{ paddingLeft: `${level * 10 + 8}px` }}
        onClick={() => (isFolder ? setExpanded(!expanded) : onFileClick(node))}
      >
        {isFolder &&
          (isLoading ? (
            <div className="w-2.5 h-2.5 border border-[#00f5ff] border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg
              className={`w-2.5 h-2.5 transition-transform text-[#6c7a8a] ${
                expanded ? "rotate-90" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          ))}
        <span className="text-sm flex-shrink-0">
          {isFolder ? (
            expanded ? (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="#00f5ff"
                fillOpacity=".7"
                stroke="#00f5ff"
                strokeWidth="1.5"
              >
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </svg>
            ) : (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="#6c7a8a"
                fillOpacity=".7"
                stroke="#6c7a8a"
                strokeWidth="1.5"
              >
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </svg>
            )
          ) : (
            getFileIcon(node.name)
          )}
        </span>
        <span className="flex-1 text-xs font-normal truncate">{node.name}</span>
        {!isFolder && (
          <span
            className="text-[9px] px-1 py-0.5 rounded font-medium"
            style={{ background: "rgba(0,245,255,.1)", color: "#00f5ff" }}
          >
            {getFileExtension(node.name)}
          </span>
        )}
        {isLoading && <span className="text-[9px] text-[#00f5ff]">Loading...</span>}
      </div>
      {isFolder && expanded && node.children && node.children.length > 0 && (
        <FileTreeView
          nodes={node.children}
          onFileClick={onFileClick}
          selectedFile={selectedFile}
          level={level + 1}
          autoExpandTitles={autoExpandTitles}
        />
      )}
    </div>
  );
}

function CodeBlock({ code }: { code: string; fileName?: string }) {
  const lines = code.split("\n");

  return (
    <div className="overflow-auto h-full w-full" style={{ background: "#0a0e1a" }}>
      <div className="flex" style={{ minWidth: "max-content" }}>
        <div
          className="text-right py-3 px-3 font-mono text-xs border-r select-none flex-shrink-0 sticky left-0"
          style={{
            background: "rgba(0,0,0,.2)",
            color: "#6c7a8a",
            borderColor: "#1a1f2e",
            minWidth: "50px",
          }}
        >
          {lines.map((_, i) => (
            <div key={i} className="leading-5 px-1" style={{ color: "#6c7a8a" }}>
              {i + 1}
            </div>
          ))}
        </div>
        <pre
          className="py-3 px-3 font-mono text-xs leading-5 flex-1"
          style={{ color: "#e2e8f0", margin: 0 }}
        >
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

function getFileIcon(name: string): React.ReactElement {
  const ext = name.split(".").pop()?.toLowerCase();
  const color: Record<string, string> = {
    js: "#f7df1e",
    jsx: "#61dafb",
    ts: "#3178c6",
    tsx: "#61dafb",
    java: "#f89820",
    py: "#3572A5",
    html: "#e34c26",
    css: "#563d7c",
    json: "#a0aec0",
    md: "#6c7a8a",
    xml: "#a0aec0",
    yml: "#a0aec0",
    yaml: "#a0aec0",
    sql: "#336791",
    sh: "#89e051",
    bash: "#89e051",
  };
  const c = color[ext || ""] || "#6c7a8a";
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function getFileExtension(name: string): string {
  return name.split(".").pop()?.toUpperCase() || "FILE";
}

function getLanguageLabel(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  const langs: Record<string, string> = {
    js: "JavaScript",
    jsx: "React",
    ts: "TypeScript",
    tsx: "React TS",
    java: "Java",
    py: "Python",
    html: "HTML",
    css: "CSS",
    json: "JSON",
    md: "Markdown",
    xml: "XML",
    yml: "YAML",
    yaml: "YAML",
    sql: "SQL",
  };
  return langs[ext || ""] || "Text";
}

function getFilePath(file: CodeFile, tree: CodeFile[]): string {
  const path: string[] = [];

  function findPath(nodes: CodeFile[], target: CodeFile, currentPath: string[] = []): boolean {
    for (const node of nodes) {
      if (node.id === target.id) {
        path.push(...currentPath, node.name);
        return true;
      }
      if (node.children && node.children.length > 0) {
        if (findPath(node.children, target, [...currentPath, node.name])) {
          return true;
        }
      }
    }
    return false;
  }

  findPath(tree, file);
  return path.join(" / ") || file.name;
}
