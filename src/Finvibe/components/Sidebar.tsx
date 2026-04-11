import type{ GenerationResult } from "../type/types";

const BANKING_CAPABILITIES = [
  { icon: "🏦", label: "Local Area Banks", sub: "Regional banking services" },
  { icon: "🏛️", label: "All India Financial Institutions", sub: "National financial institutions" },
  { icon: "💳", label: "Payments Banks", sub: "Digital payments · Deposits" },
  { icon: "🌾", label: "Regional Rural Banks", sub: "Rural banking services" },
  { icon: "🏙️", label: "Urban Co-operative Banks", sub: "City-based cooperative banking" },
  { icon: "🏠", label: "Non-Banking Financial Companies", sub: "Loans · Finance services" },
  { icon: "🔄", label: "Asset Reconstruction Companies", sub: "Bad asset recovery · NPA management" },
  { icon: "🏦", label: "Small Finance Banks", sub: "Financial inclusion · Micro loans" },
  { icon: "📊", label: "Credit Information Companies", sub: "Credit scores · Reports" },
  { icon: "🏛️", label: "Commercial Banks", sub: "Retail · Corporate banking" },
  { icon: "🌱", label: "Rural Co-operative Banks", sub: "Agricultural finance · Rural credit" },
];

const INSURANCE_CAPABILITIES = [
  { icon: "🛡️", label: "Life Insurance", sub: "Term · ULIP · Endowment · Pension" },
  { icon: "🔒", label: "General Insurance", sub: "Health · Motor · Property · Travel" },
];

interface SidebarProps {
  running: boolean;
  result: GenerationResult | null;
  codeViewResult: GenerationResult | null;
  selectedBank: string | null;
  onSelectBank: (label: string) => void;
  mode: "banking" | "insurance";
}

export function Sidebar({ running, result, codeViewResult, selectedBank, onSelectBank, mode }: SidebarProps) {
  const isInsurance = mode === "insurance";
  const capabilities = isInsurance ? INSURANCE_CAPABILITIES : BANKING_CAPABILITIES;

  const accentColor = isInsurance ? "#7C3AED" : "#3B6FFF";
  const accentBg = isInsurance ? "#F3EEFF" : "#EEF3FF";
  const accentBorder = isInsurance ? "#DDD6FE" : "#C7D8FF";
  const activeBg = isInsurance ? "#F3EEFF" : "#EEF3FF";
  const hoverBg = isInsurance ? "#FAF5FF" : "#F4F6FF";
  const logoGradient = isInsurance
    ? "linear-gradient(135deg, #7C3AED 0%, #a855f7 100%)"
    : "linear-gradient(135deg, #3B6FFF 0%, #7C3AED 100%)";
  const logoLetter = isInsurance ? "I" : "F";
  const brandName = isInsurance ? "INSURVIBE" : "FINVIBE";

  return (
    <aside
      className="w-[220px] shrink-0 flex flex-col overflow-hidden"
      style={{ background: "#FFFFFF", borderRight: "1px solid #EAECF2", boxShadow: "1px 0 0 0 #F0F2F8" }}
    >
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3 shrink-0" style={{ borderBottom: "1px solid #F0F2F8" }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0"
          style={{ background: logoGradient, boxShadow: `0 4px 12px ${accentColor}46` }}
        >
          {logoLetter}
        </div>
        <div>
          <p className="text-[13px] font-bold leading-none tracking-tight" style={{ color: "#0D1117" }}>
            {brandName}
          </p>
          <p className="text-[9px] mt-1 uppercase tracking-[0.18em] font-semibold" style={{ color: "#A0AABF" }}>
            App Builder
          </p>
        </div>
      </div>

      {/* Section label */}
      <div className="px-5 pt-4 pb-2 shrink-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: accentColor }}>
          {isInsurance ? "Insurance Types" : "Capabilities"}
        </p>
      </div>

      {/* Capability list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-0.5" style={{ scrollbarWidth: "none" }}>
        {capabilities.map((cap) => (
          <div
            key={cap.label}
            className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 cursor-pointer"
            style={{
              color: "#0D1117",
              background: selectedBank === cap.label ? activeBg : "transparent",
              borderLeft: selectedBank === cap.label ? `2.5px solid ${accentColor}` : "2.5px solid transparent",
            }}
            onClick={() => onSelectBank(cap.label)}
            onMouseEnter={(e) => {
              if (selectedBank !== cap.label)
                (e.currentTarget as HTMLElement).style.background = hoverBg;
            }}
            onMouseLeave={(e) => {
              if (selectedBank !== cap.label)
                (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <span className="text-sm leading-none shrink-0">{cap.icon}</span>
            <div className="min-w-0">
              <p className="text-[11.5px] font-semibold leading-none truncate" style={{ color: "#1A2035" }}>
                {cap.label}
              </p>
              <p className="text-[10px] mt-0.5 truncate" style={{ color: "#8A96AD" }}>
                {cap.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Status pill */}
      <div className="px-4 pb-5 shrink-0">
        <div
          className="rounded-xl px-3.5 py-2.5 flex items-center justify-between"
          style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
        >
          <p className="text-[10px] uppercase tracking-[0.14em] font-bold" style={{ color: "#8A96AD" }}>
            Status
          </p>
          <div className="flex items-center gap-1.5">
            {codeViewResult ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                <span className="text-[11px] font-semibold text-violet-600">Code View</span>
              </>
            ) : running ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
                <span className="text-[11px] font-semibold text-blue-600">Building…</span>
              </>
            ) : result ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[11px] font-semibold text-emerald-600">Complete</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#C5CDDF" }} />
                <span className="text-[11px] font-semibold" style={{ color: "#8A96AD" }}>Ready</span>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
