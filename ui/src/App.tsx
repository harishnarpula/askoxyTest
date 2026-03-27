import { useState } from "react";
import { usePipeline } from "./hooks/usePipeline";
import { PipelineFeed } from "./components/PipelineFeed";
import { PromptInput } from "./components/PromptInput";
import { FileExplorer } from "./components/FileExplorer";
import { GenerationResult } from "./types";

const CAPABILITIES = [
  { icon: "🏦", label: "Core Banking", sub: "Accounts · Ledger · Txns" },
  { icon: "💳", label: "FinTech Payments", sub: "UPI · Wallets · Gateways" },
  { icon: "🔄", label: "P2P Lending", sub: "Credit scoring · Disburse" },
  { icon: "🛍️", label: "E-Commerce", sub: "Shop · Checkout · Orders" },
  { icon: "🪪", label: "KYC / AML", sub: "Identity · Verification" },
  { icon: "🛡️", label: "Insurance", sub: "Policy · Claims · Settle" },
  { icon: "📈", label: "Wealth Mgmt", sub: "Portfolio · Trading · SIP" },
  { icon: "🪙", label: "Crypto / DeFi", sub: "Web3 · Exchange · Contracts" },
  { icon: "🏠", label: "NBFC / Lending", sub: "Loans · EMI · Compliance" },
  { icon: "📊", label: "Analytics", sub: "Dashboards · Reports · BI" },
];

const SUGGESTIONS = [
  {
    icon: "🔄",
    tag: "P2P Platform",
    text: "Build a peer-to-peer lending platform with credit scoring, KYC, and auto loan disbursement",
    color: "#0EA5E9",
    bg: "#0EA5E911",
    border: "#0EA5E930",
  },
  {
    icon: "🛍️",
    tag: "E-Commerce",
    text: "Create a multi-vendor marketplace with escrow payments, seller dashboard and analytics",
    color: "#10B981",
    bg: "#10B98111",
    border: "#10B98130",
  },
  {
    icon: "🎮",
    tag: "Gaming Wallet",
    text: "Build a gaming wallet with in-app purchases, tournament prize payouts and leaderboard",
    color: "#8B5CF6",
    bg: "#8B5CF611",
    border: "#8B5CF630",
  },
  {
    icon: "🏥",
    tag: "HealthTech",
    text: "Create a health insurance claims portal with OCR document upload and instant settlement",
    color: "#F59E0B",
    bg: "#F59E0B11",
    border: "#F59E0B30",
  },
];

export default function App() {
  const {
    steps,
    result,
    partialResult,
    chatMessage,
    running,
    error,
    stepTokens,
    prompt,
    run,
  } = usePipeline();
  const hasStarted = steps.some((s) => s.status !== "idle");

  // Code view state — lifted here so we can show/hide from PipelineFeed AND App
  const [codeViewResult, setCodeViewResult] = useState<GenerationResult | null>(
    null,
  );

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{
        background: "#0A0C12",
        fontFamily: "'DM Sans', 'Helvetica Neue', system-ui, sans-serif",
      }}
    >
      {/* ── LEFT SIDEBAR ── always visible regardless of view */}
      <aside
        className="w-[210px] shrink-0 flex flex-col overflow-hidden"
        style={{
          background: "#0F1219",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Logo */}
        <div
          className="px-4 pt-4 pb-4 flex items-center gap-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0"
            style={{
              background: "linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)",
            }}
          >
            F
          </div>
          <div>
            <p
              className="text-[13px] font-bold leading-none"
              style={{ color: "#F0F4FF" }}
            >
              FinVIBE
            </p>
            <p
              className="text-[10px] mt-1 uppercase tracking-widest font-medium"
              style={{ color: "rgba(255,255,255,0.28)" }}
            >
              App Builder
            </p>
          </div>
        </div>

        {/* Capabilities heading */}
        <div className="px-4 pt-3.5 pb-1.5 shrink-0">
          <p
            className="text-[9px] font-bold uppercase tracking-[0.15em]"
            style={{ color: "#06B6D4" }}
          >
            Capabilities
          </p>
        </div>

        {/* Capabilities list — no click, no hover, just display */}
        <div
          className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-0.5"
          style={{ scrollbarWidth: "none" }}
        >
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.label}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl"
            >
              <span className="text-sm leading-none shrink-0">{cap.icon}</span>
              <div className="min-w-0">
                <p
                  className="text-[11px] font-semibold leading-none truncate"
                  style={{ color: "rgba(255,255,255,0.52)" }}
                >
                  {cap.label}
                </p>
                <p
                  className="text-[10px] mt-0.5 truncate"
                  style={{ color: "rgba(255,255,255,0.22)" }}
                >
                  {cap.sub}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Status pill */}
        <div className="px-3 pb-4 shrink-0">
          <div
            className="rounded-xl px-3 py-2.5 flex items-center justify-between"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <p
              className="text-[10px] uppercase tracking-widest font-semibold"
              style={{ color: "#fff" }}
            >
              Status
            </p>
            <div className="flex items-center gap-1.5">
              {codeViewResult ? ( 
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                  <span className="text-[11px] font-medium text-violet-400">
                    Code View
                  </span>
                </>
              ) : running ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" />
                  <span className="text-[11px] font-medium text-blue-400">
                    Building…
                  </span>
                </>
              ) : result ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-[11px] font-medium text-emerald-400">
                    Complete
                  </span>
                </>
              ) : (
                <>
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: "#ffff" }}
                  />
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: "#fff" }}
                  >
                    Ready
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN PANEL ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* ── CODE VIEW MODE ── sidebar visible, code fills the rest */}
        {codeViewResult ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Code view header with back button */}
            <div
              className="shrink-0 px-5 py-2.5 flex items-center gap-3"
              style={{
                background: "#0F1219",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <button
                onClick={() => setCodeViewResult(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.1)";
                  (e.currentTarget as HTMLElement).style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.06)";
                  (e.currentTarget as HTMLElement).style.color =
                    "rgba(255,255,255,0.6)";
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M8 1L3 6l5 5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Back to Pipeline
              </button>
              <span className="text-sm font-bold" style={{ color: "#F0F4FF" }}>
                Generated Code
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.42)",
                }}
              >
                {codeViewResult.backend.length +
                  codeViewResult.frontend.length +
                  codeViewResult.database.length}{" "}
                files
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                <span className="text-xs font-medium text-emerald-400">
                  Generation complete
                </span>
              </div>
            </div>
            {/* Full height file explorer */}
            <div className="flex-1 overflow-hidden">
              <FileExplorer result={codeViewResult} />
            </div>
          </div>
        ) : !hasStarted ? (
          /* ─── LANDING STATE ─── */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-8 py-6">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5"
                style={{
                  background: "rgba(99,102,241,0.12)",
                  border: "1px solid rgba(99,102,241,0.25)",
                  color: "#A5B4FC",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                AI-Powered Code Generator
              </div>
              <h1
                className="text-[32px] font-black tracking-tight text-center leading-[1.1] mb-3"
                style={{ color: "#F0F4FF", letterSpacing: "-0.03em" }}
              >
                What are you building
                <br />
                <span
                  style={{
                    background:
                      "linear-gradient(90deg, #3B82F6, #8B5CF6, #06B6D4)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  today?
                </span>
              </h1>
              <p
                className="text-sm text-center mb-6 max-w-sm leading-relaxed"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Describe any fintech app — FinVIBE architects, designs, and
                generates production-ready code in seconds.
              </p>
              <div className="w-full max-w-2xl grid grid-cols-2 gap-2.5 mb-4">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => run(s.text)}
                    disabled={running}
                    className="text-left px-4 py-3.5 rounded-2xl transition-all duration-200 disabled:opacity-40"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = s.bg;
                      (e.currentTarget as HTMLElement).style.borderColor =
                        s.border;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(255,255,255,0.04)";
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "rgba(255,255,255,0.08)";
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm">{s.icon}</span>
                      <span
                        className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md"
                        style={{
                          background: s.bg,
                          color: s.color,
                          border: `1px solid ${s.border}`,
                        }}
                      >
                        {s.tag}
                      </span>
                    </div>
                    <p
                      className="text-[11px] leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.45)" }}
                    >
                      {s.text}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            <div
              className="shrink-0 px-8 py-4"
              style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
                background: "#0A0C12",
              }}
            >
              <div className="max-w-2xl mx-auto">
                <PromptInput onSubmit={run} disabled={running} />
              </div>
            </div>
          </div>
        ) : (
          /* ─── ACTIVE PIPELINE STATE ─── */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <PipelineFeed
                steps={steps}
                stepTokens={stepTokens}
                result={result}
                partialResult={partialResult}
                running={running}
                error={error}
                chatMessage={chatMessage}
                prompt={prompt}
                onViewCode={setCodeViewResult}
              />
            </div>
            <div
              className="shrink-0 px-5 py-3"
              style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
                background: "#0A0C12",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)",
                  }}
                >
                  F
                </div>
                <div className="flex-1">
                  <PromptInput onSubmit={run} disabled={running} compact />
                </div>
                {running && (
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full shrink-0"
                    style={{
                      background: "rgba(59,130,246,0.12)",
                      border: "1px solid rgba(59,130,246,0.25)",
                    }}
                  >
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                    <span className="text-xs font-semibold text-blue-400">
                      Building…
                    </span>
                  </div>
                )}
                {result && !running && (
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full shrink-0"
                    style={{
                      background: "rgba(16,185,129,0.12)",
                      border: "1px solid rgba(16,185,129,0.25)",
                    }}
                  >
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    <span className="text-xs font-semibold text-emerald-400">
                      Done
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
