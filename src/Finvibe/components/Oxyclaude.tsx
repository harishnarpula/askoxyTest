import { useState, useRef, useEffect, useCallback } from "react";
import type React from "react";
import BASE_URL from "../../Config";

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
 fileNames?: string[];
  timestamp: Date;
}

interface AttachedFile {
  raw: File;
  name: string;
  size: number;
  isImage: boolean;
}

const CHAT_URL = `${BASE_URL}/vibecode-service/claude/chat`;
const FILE_URL = `${BASE_URL}/vibecode-service/claude/chat/file`;

const ANTHROPIC_MODELS = [
  { id: "claude-opus-4-6", label: "Claude Opus 4.6", desc: "Most capable" },
  { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", desc: "Balanced" },
  { id: "claude-opus-4-0", label: "Claude Opus 4", desc: "Powerful" },
  { id: "claude-sonnet-4-0", label: "Claude Sonnet 4", desc: "Smart" },
];

const uid = () => Math.random().toString(36).slice(2, 9);
const fmtTime = (d: Date) =>
  d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
const fmtBytes = (b: number) =>
  b < 1024
    ? `${b} B`
    : b < 1048576
      ? `${(b / 1024).toFixed(1)} KB`
      : `${(b / 1048576).toFixed(1)} MB`;

// ── API calls — plain JSON { status, response } ───────────────────────────────
async function callChat(
  history: { role: string; content: string }[],
  model: string,
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch(`${CHAT_URL}?model=${encodeURIComponent(model)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(history),
    signal,
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const text = await res.text();

  try {
    const json = JSON.parse(text);
    return json.response ?? "";
  } catch (e) {
    console.error("Invalid JSON response:", text);
    throw new Error("Server returned invalid response (streaming detected)");
  }
}

async function callChatWithFiles(
  files: File[],
  message: string,
  model: string,
  signal: AbortSignal,
): Promise<string> {
  const form = new FormData();

  files.forEach((file) => {
    form.append("files", file); // 🔥 important
  });

  form.append("message", message);

  const res = await fetch(
    `http://localhost:9876/api/vibecode-service/claude/chat/files?model=${encodeURIComponent(model)}`,
    {
      method: "POST",
      body: form,
      signal,
    },
  );

  if (!res.ok) throw new Error(`Server error ${res.status}`);

  const json = await res.json();
  return json.response ?? "";
}

// ── Loader ────────────────────────────────────────────────────────────────────
function ThinkingLoader() {
  return (
    <div className="flex gap-3 items-start">
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md"
        style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
      >
        AI
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-3">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <span className="text-xs text-slate-400 font-medium">Thinking…</span>
      </div>
    </div>
  );
}

function renderInline(text: string, isUser: boolean): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[([^\]]+)\]\(([^)]+)\))/g;

  let last = 0,
    m: RegExpExecArray | null,
    key = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));

    const raw = m[0];

    if (raw.startsWith("`")) {
      parts.push(
        <code
          key={key++}
          className={`rounded px-1 py-0.5 text-[12px] font-mono ${
            isUser ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"
          }`}
        >
          {raw.slice(1, -1)}
        </code>,
      );
    } else if (raw.startsWith("**")) {
      parts.push(
        <strong key={key++} className="font-semibold">
          {raw.slice(2, -2)}
        </strong>,
      );
    } else if (raw.startsWith("*")) {
      parts.push(<em key={key++}>{raw.slice(1, -1)}</em>);
    } else if (raw.startsWith("[")) {
      parts.push(
        <a
          key={key++}
          href={m[3]}
          target="_blank"
          rel="noreferrer"
          className={`underline ${isUser ? "text-white" : "text-indigo-600"}`}
        >
          {m[2]}
        </a>,
      );
    }

    last = m.index + raw.length;
  }

  if (last < text.length) parts.push(text.slice(last));

  return parts;
}

function startsWithEmoji(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed) return false;
  const cp = trimmed.codePointAt(0);
  if (cp === undefined) return false;
  return (
    (cp >= 0x1f300 && cp <= 0x1faff) || // Misc symbols, emoticons, transport, etc.
    (cp >= 0x2600 && cp <= 0x27bf) || // Misc symbols & dingbats
    (cp >= 0xfe00 && cp <= 0xfe0f) || // Variation selectors
    cp === 0x200d // ZWJ
  );
}

// A proper markdown table row: starts AND ends with |, and has 2+ cells
function isTableRow(s: string): boolean {
  const t = s.trim();
  if (!t.startsWith("|") || !t.endsWith("|")) return false;
  return t.split("|").length - 2 >= 2;
}

function _renderCodeBlock(lang: string, code: string, key: string) {
  return (
    <div
      key={key}
      className="my-3 rounded-xl overflow-hidden border border-slate-200"
    >
      {lang && (
        <div className="bg-slate-100 px-3 py-1 text-[10px] font-mono text-slate-500 border-b border-slate-200 uppercase tracking-wider">
          {lang}
        </div>
      )}
      <pre className="bg-slate-950 text-slate-100 text-[12px] font-mono p-4 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MarkdownContent({
  content,
  isUser = false,
}: {
  content: string;
  isUser?: boolean;
}) {
  const textColor = isUser ? "text-white" : "text-slate-700";
  const headingColor = isUser ? "text-white" : "text-slate-900";

  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      nodes.push(<div key={`bl-${i}`} className="h-2" />);
      i++;
      continue;
    }

    // Code block
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }

      nodes.push(
        <div
          key={`code-${i}`}
          className="my-3 rounded-xl overflow-hidden border border-slate-200"
        >
          {lang && (
            <div className="bg-slate-100 px-3 py-1 text-[10px] text-slate-500 border-b">
              {lang}
            </div>
          )}
          <pre className="bg-slate-100 text-slate-800 text-[12px] font-mono p-4 overflow-x-auto leading-relaxed">
            <code>{codeLines.join("\n")}</code>
          </pre>
        </div>,
      );

      i++;
      continue;
    }

    // Headings
    const hMatch = trimmed.match(/^(#{1,4})\s+(.+)/);
    if (hMatch) {
      nodes.push(
        <p key={`h-${i}`} className={`font-bold mt-3 ${headingColor}`}>
          {hMatch[2]}
        </p>,
      );
      i++;
      continue;
    }

    // Lists
    if (/^[-*]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }

      nodes.push(
        <ul key={`ul-${i}`} className="pl-2 space-y-1">
          {items.map((it, idx) => (
            <li key={idx} className={`flex gap-2 ${textColor}`}>
              <span>•</span>
              <span>{renderInline(it, isUser)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Paragraph
    nodes.push(
      <p key={`p-${i}`} className={`text-[13.5px] ${textColor}`}>
        {renderInline(trimmed, isUser)}
      </p>,
    );

    i++;
  }

  return <div className="space-y-1">{nodes}</div>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={copy}
      title="Copy response"
      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100"
    >
      {copied ? (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={`flex gap-3 group ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm select-none text-white"
        style={{
          background: isUser
            ? "linear-gradient(135deg,#6366f1,#4f46e5)"
            : "linear-gradient(135deg,#6366f1,#8b5cf6)",
        }}
      >
        {isUser ? "U" : "AI"}
      </div>

      <div
        className={`max-w-[78%] flex flex-col gap-1 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
       {msg.fileNames && msg.fileNames.length > 0 && (
  <div className="flex flex-wrap gap-1">
    {msg.fileNames.map((name, i) => (
      <span
        key={i}
        className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full"
      >
        📎 {name}
      </span>
    ))}
  </div>
)}
        <div
          className={`px-4 py-3 rounded-2xl shadow-md backdrop-blur-sm ${
            isUser
              ? "text-white rounded-tr-sm"
              : "bg-white/90 border border-slate-200 rounded-tl-sm"
          }`}
          style={
            isUser
              ? { background: "linear-gradient(135deg,#6366f1,#4f46e5)" }
              : {}
          }
        >
          <MarkdownContent content={msg.content} isUser={isUser} />
        </div>
        <div
          className={`flex items-center gap-2 ${
            isUser ? "self-end" : "self-start"
          }`}
        >
          <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
            {fmtTime(msg.timestamp)}
          </span>
          {!isUser && <CopyButton text={msg.content} />}
        </div>
      </div>
    </div>
  );
}

function FileChip({
  file,
  onRemove,
}: {
  file: AttachedFile;
  onRemove: () => void;
}) {
  const isImage = file.raw.type.startsWith("image/");
  const isExcel = file.name.endsWith(".xls") || file.name.endsWith(".xlsx");
  const isPdf = file.raw.type === "application/pdf";

  return (
    <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1 text-xs max-w-[260px]">
      <span>{isImage ? "🖼️" : isExcel ? "📊" : isPdf ? "📄" : "📁"}</span>
      <span className="truncate text-indigo-700 font-medium">{file.name}</span>
      <span className="text-slate-400 flex-shrink-0">
        {fmtBytes(file.size)}
      </span>
      <button
        onClick={onRemove}
        className="ml-0.5 text-slate-400 hover:text-red-500"
      >
        ✕
      </button>
    </div>
  );
}

// ── Voice Recorder Hook ──────────────────────────────────────────────────────
function useVoiceRecorder(onResult: (text: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const startRecording = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";

    recognition.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscript += t + " ";
        else interim = t;
      }
      onResult((finalTranscript + interim).trimStart());
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [onResult]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  return { isRecording, isSupported, startRecording, stopRecording };
}

export default function OxyClaude() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(ANTHROPIC_MODELS[0].id);
  const [modelOpen, setModelOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const userScrolledUp = useRef(false);

  const { isRecording, isSupported, startRecording, stopRecording } =
    useVoiceRecorder((text) => setInput(text));

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      userScrolledUp.current = !atBottom;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!userScrolledUp.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    userScrolledUp.current = false;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  const handleFile = useCallback((file: File) => {
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setError("File must be under 20 MB.");
      return;
    }

    setAttachedFiles((prev) => [
      ...prev,
      {
        raw: file,
        name: file.name,
        size: file.size,
        isImage: file.type.startsWith("image/"),
      },
    ]);

    setError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      files.forEach(handleFile);
    },
    [handleFile],
  );

  const handleNewChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setAttachedFiles([]);
    setError(null);
    setIsLoading(false);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text && attachedFiles.length === 0) return;
    if (isLoading) return;

    const userMsg: Message = {
      id: uid(),
      role: "user",
      content: text || "Please analyse this file.",
      fileNames:
  attachedFiles.length > 0
    ? attachedFiles.map(f => f.name)
    : undefined,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    scrollToBottom();
    setIsLoading(true);
    setError(null);

    const filesSnap = attachedFiles;
    setAttachedFiles([]);

    const ac = new AbortController();
    abortRef.current = ac;

    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userMsg.content },
    ];

    try {
      const response =
        filesSnap.length > 0
          ? await callChatWithFiles(
              filesSnap.map((f) => f.raw),
              userMsg.content,
              selectedModel,
              ac.signal,
            )
          : await callChat(history, selectedModel, ac.signal);

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant" as Role,
          content: response,
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        const msg = err instanceof Error ? err.message : "";
        setError(
          msg.includes("500")
            ? "Unable to get a response from this model. Please try again later or switch to a different model."
            : msg || "Something went wrong.",
        );
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;
  const suggestions = [
    "What are the latest news updates today?",
    "Explain how AI works in simple terms",
    "Write a React component for a login form",
    "What are the trending technologies in 2026?",
  ];

  return (
    <div
      className="flex flex-col h-screen overflow-hidden text-slate-900"
      style={{
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
        background:
          "linear-gradient(135deg,#f0f4ff 0%,#faf5ff 50%,#f0f9ff 100%)",
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Dot grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px,rgba(99,102,241,0.07) 1px,transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Top accent bar */}
      <div
        className="fixed top-0 inset-x-0 h-[3px] pointer-events-none z-20"
        style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa)" }}
      />

      {/* ── Header ── */}
      <header
        className="relative z-10 flex-shrink-0 backdrop-blur-xl bg-white/70 border-b border-white/60 shadow-sm"
        style={{ background: "rgba(255,255,255,0.85)" }}
      >
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base font-bold shadow-md"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              ◈
            </div>
            <div>
              <h1
                className="text-[15px] font-extrabold tracking-tight leading-none"
                style={{
                  background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                OXY GPT
              </h1>
              <p className="text-[9px] tracking-[0.18em] uppercase text-slate-400 font-medium mt-0.5">
                Intelligent · Precise · Aware
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Chat
            </button>
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wide">
                Live
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Messages ── */}
      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto relative z-10 min-h-0"
      >
        <div className="max-w-3xl mx-auto px-5 py-6 flex flex-col gap-4">
          {isEmpty && (
            <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-3xl shadow-xl"
                style={{
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                }}
              >
                ◈
              </div>
              <div className="max-w-sm">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  How can I help you Today?
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Ask anything — code, AI, news, or upload a file.
                </p>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="px-4 py-2 text-xs font-medium border border-slate-200 bg-white text-slate-500 rounded-full hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {isLoading && <ThinkingLoader />}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Drag overlay */}
      {dragOver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          style={{
            background: "rgba(255,255,255,0.92)",
            border: "2px dashed #6366f1",
          }}
        >
          <div className="text-center">
            <div className="text-6xl mb-4">📂</div>
            <p className="text-indigo-600 text-xl font-bold">
              Drop your file here
            </p>
            <p className="text-slate-500 text-sm mt-1">Any file · max 20 MB</p>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer
        className="relative z-10 flex-shrink-0 backdrop-blur-md border-t border-white/60 shadow-[0_-4px_24px_rgba(99,102,241,0.06)]"
        style={{ background: "rgba(255,255,255,0.9)" }}
      >
        <div className="max-w-3xl mx-auto px-5 py-3 flex flex-col gap-2">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
              <span>⚠</span>
              <span className="flex-1">{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                ✕
              </button>
            </div>
          )}

          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((file, index) => (
                <FileChip
                  key={index}
                  file={file}
                  onRemove={() =>
                    setAttachedFiles((prev) =>
                      prev.filter((_, i) => i !== index),
                    )
                  }
                />
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* Input box */}
            <div
              className={`flex-1 flex items-end gap-2 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-md px-3 py-2.5 transition-all duration-200 shadow-sm
                ${
                  dragOver
                    ? "ring-2 ring-indigo-400"
                    : "ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-indigo-400 focus-within:shadow-md focus-within:shadow-indigo-50"
                }`}
            >
              <button
                onClick={() => fileRef.current?.click()}
                title="Upload any file"
                className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mb-0.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  files.forEach(handleFile);
                  e.target.value = "";
                }}
              />

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isRecording
                    ? "Listening…"
                    : attachedFiles.length > 0
                      ? "Ask about this file…"
                      : "Message OXY GPT…"
                }
                rows={1}
                disabled={false}
                className="flex-1 bg-transparent resize-none outline-none text-slate-800 text-[13.5px] placeholder-slate-400 leading-relaxed py-0.5 disabled:opacity-50"
                style={{ minHeight: "22px", maxHeight: "120px" }}
              />

              {/* Voice recorder button */}
              {isSupported && (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  title={isRecording ? "Stop recording" : "Start voice input"}
                  disabled={false}
                  className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mb-0.5 transition-all ${
                    isRecording
                      ? "bg-red-50 text-red-500 border border-red-300 hover:bg-red-100"
                      : "text-slate-400 hover:text-indigo-500 hover:bg-indigo-50"
                  } disabled:opacity-40`}
                >
                  {isRecording ? (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <rect x="4" y="4" width="16" height="16" rx="2" />
                      </svg>
                    </span>
                  ) : (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <rect x="9" y="2" width="6" height="12" rx="3" />
                      <path d="M5 10a7 7 0 0014 0" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                      <line x1="9" y1="22" x2="15" y2="22" />
                    </svg>
                  )}
                </button>
              )}
              <div className="relative">
                <button
                  onClick={() => setModelOpen((v) => !v)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-[11px] font-semibold whitespace-nowrap hover:bg-indigo-100 transition-all"
                >
                  ✨{" "}
                  {
                    ANTHROPIC_MODELS.find(
                      (m) => m.id === selectedModel,
                    )?.label?.split(" ")[1]
                  }
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="ml-1"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {modelOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setModelOpen(false)}
                    />

                    <div className="absolute bottom-12 left-0 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                      <div className="px-3 py-2 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase">
                        Models
                      </div>

                      {ANTHROPIC_MODELS.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setSelectedModel(m.id);
                            setModelOpen(false);
                          }}
                          className={`w-full flex justify-between px-3 py-2 text-sm hover:bg-indigo-50 transition ${
                            selectedModel === m.id
                              ? "bg-indigo-50 text-indigo-600 font-semibold"
                              : "text-slate-700"
                          }`}
                        >
                          <span>{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {!isLoading && (
                <button
                  onClick={handleSend}
                  disabled={!input.trim() && attachedFiles.length === 0}
                  className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mb-0.5 transition-all duration-200
    ${
      !input.trim() && attachedFiles.length === 0
        ? "bg-slate-100 text-slate-300 cursor-not-allowed"
        : "text-white hover:opacity-90 active:scale-95 shadow-md"
    }`}
                  style={
                    !input.trim() && attachedFiles.length === 0
                      ? {}
                      : {
                          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                        }
                  }
                >
                  {isLoading ? (
                    <svg
                      className="animate-spin w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0110 10" />
                    </svg>
                  ) : (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                    >
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
