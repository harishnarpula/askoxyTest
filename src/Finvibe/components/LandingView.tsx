import { PromptInput } from "./PromptInput";

type Suggestion = { icon: string; tag: string; text: string; color: string; bg: string; border: string; dot: string };

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { icon: "🔄", tag: "P2P Lending", text: "Build a peer-to-peer lending platform with lender module, borrower module, admin dashboard, wallet system, escrow management, credit scoring APIs, KYC/AML verification, secure payment flows, repayment tracking, and scalable architecture following RBI guidelines", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", dot: "#3B82F6" },
  { icon: "🏦", tag: "Core Banking", text: "Build a core banking system with account management, transaction processing, loan origination, deposit products, interest calculation, GL integration, and RBI regulatory reporting", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", dot: "#10B981" },
  { icon: "💳", tag: "Digital Banking", text: "Build a digital banking super-app with retail banking, UPI payments, fund transfers, account statements, KYC onboarding, and personalised financial insights following RBI guidelines", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", dot: "#8B5CF6" },
  { icon: "📊", tag: "NBFC Platform", text: "Build an NBFC lending platform with loan origination, credit bureau integration, collections management, co-lending workflows, ALM reporting, and RBI NBFC compliance automation", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
];

const BANK_CONTENT: Record<string, { title: string; desc: string; suggestions: Suggestion[] }> = {
  "Local Area Banks": {
    title: "Build apps for Local Area Banks",
    desc: "Create hyper-local banking solutions — branch management, local deposits, community lending, and regional compliance.",
    suggestions: [
      { icon: "🏦", tag: "Branch Portal", text: "Build a branch management portal for a local area bank with teller operations, account opening, local deposit management, and branch-level reporting dashboard", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", dot: "#3B82F6" },
      { icon: "💰", tag: "Community Lending", text: "Build a community lending platform for local area banks with loan origination, credit assessment, repayment tracking, and local compliance reporting", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", dot: "#10B981" },
      { icon: "📋", tag: "KYC Module", text: "Build a KYC and onboarding module for local area bank customers with document upload, verification workflow, and RBI compliance checks", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", dot: "#8B5CF6" },
      { icon: "📊", tag: "Reports Dashboard", text: "Build a regulatory reporting dashboard for local area banks with RBI returns, audit trails, branch-wise analytics, and automated report generation", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
    ],
  },
  "All India Financial Institutions": {
    title: "Build apps for All India Financial Institutions",
    desc: "Power national-scale financial operations — large project financing, infrastructure lending, and institutional fund management.",
    suggestions: [  
      { icon: "🏗️", tag: "Project Finance", text: "Build a project finance management system for All India Financial Institutions with loan disbursement, milestone tracking, escrow management, and compliance reporting", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", dot: "#3B82F6" },
      { icon: "📈", tag: "Fund Management", text: "Build an institutional fund management platform with portfolio tracking, NAV calculation, investor reporting, and regulatory compliance for national financial institutions", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", dot: "#10B981" },
      { icon: "🔍", tag: "Due Diligence", text: "Build a due diligence and credit appraisal system for large infrastructure projects with risk scoring, document management, and approval workflows", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", dot: "#8B5CF6" },
      { icon: "📜", tag: "Compliance Portal", text: "Build a compliance and regulatory reporting portal for All India Financial Institutions with SEBI, RBI, and MCA filings, audit management, and automated alerts", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
    ],
  },
  "Payments Banks": {
    title: "Build apps for Payments Banks",
    desc: "Design digital-first payment experiences — wallets, UPI, bill payments, and last-mile financial inclusion.",
    suggestions: [
      { icon: "💳", tag: "Digital Wallet", text: "Build a digital wallet platform for a payments bank with UPI integration, bill payments, money transfer, transaction history, and KYC-based onboarding", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", dot: "#3B82F6" },
      { icon: "🔄", tag: "P2P Transfer", text: "Build a peer-to-peer money transfer system for payments banks with instant settlement, beneficiary management, transaction limits, and fraud detection", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", dot: "#10B981" },
      { icon: "🧾", tag: "Bill Payments", text: "Build a bill payments and recharge platform for payments banks with BBPS integration, utility payments, subscription management, and payment receipts", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", dot: "#8B5CF6" },
      { icon: "📱", tag: "Agent Banking", text: "Build a banking correspondent and agent banking app for payments banks with cash-in/cash-out, mini statements, account opening, and commission tracking", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
    ],
  },
  "Regional Rural Banks": {
    title: "Build apps for Regional Rural Banks",
    desc: "Empower rural communities — agricultural loans, SHG management, crop insurance, and rural financial inclusion.",
    suggestions: [
      { icon: "🌾", tag: "Agri Loans", text: "Build an agricultural loan management system for regional rural banks with crop loan origination, Kisan Credit Card management, subsidy tracking, and repayment schedules", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", dot: "#10B981" },
      { icon: "👥", tag: "SHG Management", text: "Build a Self Help Group management platform for rural banks with group formation, savings tracking, internal lending, and government scheme integration", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", dot: "#3B82F6" },
      { icon: "🌧️", tag: "Crop Insurance", text: "Build a crop insurance management system with PMFBY integration, claim filing, weather data integration, farmer onboarding, and payout processing", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", dot: "#8B5CF6" },
      { icon: "🏘️", tag: "Rural Outreach", text: "Build a rural outreach and financial literacy portal for regional rural banks with scheme awareness, loan eligibility checker, and vernacular language support", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
    ],
  },
  "Urban Co-operative Banks": {
    title: "Build apps for Urban Co-operative Banks",
    desc: "Serve city-based cooperative members — member management, share capital, recurring deposits, and urban lending.",
    suggestions: [
      { icon: "🏙️", tag: "Member Portal", text: "Build a member management portal for urban co-operative banks with share capital tracking, membership onboarding, dividend management, and member self-service", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", dot: "#3B82F6" },
      { icon: "💼", tag: "Loan Management", text: "Build a loan management system for urban co-operative banks with personal, housing, and vehicle loan origination, EMI tracking, and NPA management", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", dot: "#10B981" },
      { icon: "🏦", tag: "Deposit Products", text: "Build a deposit management system for urban co-operative banks with FD, RD, savings accounts, interest calculation, and maturity alerts", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", dot: "#8B5CF6" },
      { icon: "📊", tag: "Board Reporting", text: "Build a board and audit reporting dashboard for urban co-operative banks with financial summaries, compliance status, and regulatory return filing", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
    ],
  },
  "Non-Banking Financial Companies": {
    title: "Build apps for NBFCs",
    desc: "Accelerate lending operations — loan origination, collections, co-lending, and NBFC-specific compliance.",
    suggestions: [
      { icon: "🏠", tag: "Loan Origination", text: "Build a loan origination system for an NBFC with personal, home, and MSME loan workflows, credit bureau integration, document collection, and approval pipelines", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", dot: "#3B82F6" },
      { icon: "📞", tag: "Collections", text: "Build a collections and recovery management platform for NBFCs with delinquency tracking, agent assignment, payment reconciliation, and legal escalation workflows", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", dot: "#EF4444" },
      { icon: "🤝", tag: "Co-Lending", text: "Build a co-lending platform for NBFCs with bank partnership management, loan pool creation, risk sharing, disbursement coordination, and regulatory reporting", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", dot: "#8B5CF6" },
      { icon: "📋", tag: "RBI Compliance", text: "Build an RBI compliance and reporting portal for NBFCs with CRILC reporting, FIU-IND filings, ALM reports, and automated regulatory return generation", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
    ],
  },
  "Asset Reconstruction Companies": {
    title: "Build apps for Asset Reconstruction Companies",
    desc: "Streamline NPA resolution — bad asset acquisition, recovery tracking, security receipts, and SARFAESI compliance.",
    suggestions: [
      { icon: "🔄", tag: "NPA Acquisition", text: "Build an NPA acquisition and portfolio management system for ARCs with asset valuation, bid management, bank negotiations, and acquisition tracking", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", dot: "#3B82F6" },
      { icon: "⚖️", tag: "Recovery Tracking", text: "Build a recovery management platform for ARCs with SARFAESI actions, DRT case tracking, settlement negotiations, and recovery milestone management", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", dot: "#EF4444" },
      { icon: "📜", tag: "Security Receipts", text: "Build a security receipt management system for ARCs with SR issuance, investor management, NAV calculation, redemption tracking, and SEBI compliance", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", dot: "#8B5CF6" },
      { icon: "📊", tag: "ARC Dashboard", text: "Build an ARC operations dashboard with portfolio health metrics, recovery rate analytics, legal case status, and RBI regulatory reporting", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
    ],
  },
  "Small Finance Banks": {
    title: "Build apps for Small Finance Banks",
    desc: "Drive financial inclusion — microfinance, MSME lending, affordable deposits, and underserved segment banking.",
    suggestions: [
      { icon: "🏦", tag: "Microfinance", text: "Build a microfinance loan management system for small finance banks with JLG/SHG lending, field officer app, repayment collection, and portfolio at risk tracking", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", dot: "#3B82F6" },
      { icon: "🏭", tag: "MSME Lending", text: "Build an MSME loan origination and monitoring platform for small finance banks with GST-based underwriting, cash flow analysis, and collateral management", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", dot: "#10B981" },
      { icon: "💳", tag: "Savings Products", text: "Build a savings and deposit product management system for small finance banks with zero-balance accounts, recurring deposits, and interest payout automation", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", dot: "#8B5CF6" },
      { icon: "📱", tag: "Field Officer App", text: "Build a field officer mobile app for small finance banks with customer onboarding, loan collection, GPS tracking, offline sync, and daily performance reporting", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
    ],
  },
  "Credit Information Companies": {
    title: "Build apps for Credit Information Companies",
    desc: "Build credit intelligence tools — bureau integrations, credit score APIs, dispute management, and analytics.",
    suggestions: [
      { icon: "📊", tag: "Credit Score API", text: "Build a credit score API integration platform with CIBIL, Experian, and CRIF bureau connections, score fetching, report parsing, and lender dashboard", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", dot: "#3B82F6" },
      { icon: "🔍", tag: "Dispute Management", text: "Build a credit dispute management portal for consumers with dispute filing, bureau communication tracking, resolution timelines, and status notifications", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", dot: "#EF4444" },
      { icon: "📈", tag: "Credit Analytics", text: "Build a credit analytics and risk intelligence dashboard with bureau data trends, default prediction models, segment analysis, and lender benchmarking", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", dot: "#8B5CF6" },
      { icon: "🏢", tag: "Lender Portal", text: "Build a lender portal for credit information companies with bulk bureau pulls, consent management, credit policy configuration, and compliance audit trails", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
    ],
  },
  "Commercial Banks": {
    title: "Build apps for Commercial Banks",
    desc: "Power retail and corporate banking — core banking integrations, trade finance, treasury, and digital channels.",
    suggestions: [
      { icon: "🔄", tag: "P2P Platform", text: "Build a peer-to-peer lending platform with lender module, borrower module, admin dashboard, wallet system, escrow management, credit scoring APIs, KYC/AML verification, secure payment flows, repayment tracking, and scalable architecture following RBI guidelines", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", dot: "#3B82F6" },
      { icon: "🏢", tag: "Corporate Banking", text: "Build a corporate banking portal with trade finance, LC management, bank guarantees, cash management, bulk payments, and relationship manager dashboard", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", dot: "#10B981" },
      { icon: "💹", tag: "Treasury", text: "Build a treasury management system for commercial banks with forex dealing, money market operations, investment portfolio, ALM, and risk management", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", dot: "#8B5CF6" },
      { icon: "📱", tag: "Digital Banking", text: "Build a digital banking super-app with retail banking, investments, insurance, credit cards, UPI, and personalised financial insights", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
    ],
  },
  "Rural Co-operative Banks": {
    title: "Build apps for Rural Co-operative Banks",
    desc: "Support agricultural communities — crop loans, PACS integration, rural deposits, and cooperative governance.",
    suggestions: [
      { icon: "🌱", tag: "PACS Integration", text: "Build a PACS and district co-operative bank integration platform with loan pass-through, member data sync, subsidy disbursement, and state-level reporting", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", dot: "#10B981" },
      { icon: "🌾", tag: "Crop Loans", text: "Build a crop loan management system for rural co-operative banks with seasonal loan scheduling, land record integration, insurance linkage, and waiver management", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", dot: "#3B82F6" },
      { icon: "🏘️", tag: "Rural Deposits", text: "Build a rural deposit management system with village-level savings accounts, recurring deposits, interest calculation, and doorstep banking support", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", dot: "#8B5CF6" },
      { icon: "📋", tag: "Governance Portal", text: "Build a cooperative governance portal for rural co-operative banks with board meeting management, audit compliance, election management, and NABARD reporting", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
    ],
  },
};

const INSURANCE_CONTENT: Record<string, { title: string; desc: string; suggestions: Suggestion[] }> = {
  "Life Insurance": {
    title: "Build apps for Life Insurance",
    desc: "Create intelligent life insurance platforms — policy management, ULIP tracking, claims automation, and IRDAI compliance.",
    suggestions: [
      { icon: "🛡️", tag: "Policy Management", text: "Build a life insurance policy management system with term, ULIP, and endowment products, premium tracking, renewal alerts, nominee management, and IRDAI compliance reporting", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", dot: "#8B5CF6" },
      { icon: "💰", tag: "Claims Portal", text: "Build a life insurance claims management portal with death claim filing, document upload, investigation workflow, settlement processing, and fraud detection", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", dot: "#10B981" },
      { icon: "📊", tag: "Agent Dashboard", text: "Build a life insurance agent management platform with lead tracking, policy issuance, commission calculation, renewal reminders, and performance analytics", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", dot: "#3B82F6" },
      { icon: "📋", tag: "Underwriting", text: "Build a life insurance underwriting system with risk assessment, medical history evaluation, premium calculation engine, and automated policy approval workflows", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
    ],
  },
  "General Insurance": {
    title: "Build apps for General Insurance",
    desc: "Power health, motor, property, and travel insurance — policy lifecycle, claims intelligence, and real-time risk scoring.",
    suggestions: [
      { icon: "🏥", tag: "Health Insurance", text: "Build a health insurance platform with policy issuance, cashless hospitalisation, TPA integration, claims adjudication, fraud detection, and IRDAI compliance", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", dot: "#8B5CF6" },
      { icon: "🚗", tag: "Motor Insurance", text: "Build a motor insurance system with vehicle onboarding, OD and TP policy management, garage network integration, surveyor assignment, and claims settlement", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", dot: "#3B82F6" },
      { icon: "🏠", tag: "Property Insurance", text: "Build a property insurance platform with asset valuation, policy issuance, natural disaster claims, reinstatement tracking, and reinsurance management", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", dot: "#10B981" },
      { icon: "✈️", tag: "Travel Insurance", text: "Build a travel insurance system with trip protection policies, flight delay claims, medical emergency coverage, baggage loss processing, and real-time assistance", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
    ],
  },
};

const DEFAULT_INSURANCE_SUGGESTIONS: Suggestion[] = [
  { icon: "🛡️", tag: "Life Insurance", text: "Build a life insurance policy management system with term, ULIP, and endowment products, premium tracking, renewal alerts, nominee management, and IRDAI compliance reporting", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", dot: "#8B5CF6" },
  { icon: "🏥", tag: "Health Insurance", text: "Build a health insurance platform with policy issuance, cashless hospitalisation, TPA integration, claims adjudication, fraud detection, and IRDAI compliance", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", dot: "#10B981" },
  { icon: "🚗", tag: "Motor Insurance", text: "Build a motor insurance system with vehicle onboarding, OD and TP policy management, garage network integration, surveyor assignment, and claims settlement", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", dot: "#3B82F6" },
  { icon: "✈️", tag: "Travel Insurance", text: "Build a travel insurance system with trip protection policies, flight delay claims, medical emergency coverage, baggage loss processing, and real-time assistance", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
];

interface LandingViewProps {
  running: boolean;
  onRun: (prompt: string) => void;
  selectedBank: string | null;
  mode: "banking" | "insurance";
}

export function LandingView({ running, onRun, selectedBank, mode }: LandingViewProps) {
  const isInsurance = mode === "insurance";
  const contentMap = isInsurance ? INSURANCE_CONTENT : BANK_CONTENT;
  const defaultSuggestions = isInsurance ? DEFAULT_INSURANCE_SUGGESTIONS : DEFAULT_SUGGESTIONS;
  const bankContent = selectedBank ? contentMap[selectedBank] : null;
  const suggestions = bankContent?.suggestions ?? defaultSuggestions;
  const brandName = isInsurance ? "INSURVIBE" : "FINVIBE";
  const brandGradient = isInsurance
    ? "linear-gradient(90deg,#7C3AED 0%,#a855f7 55%,#06B6D4 100%)"
    : "linear-gradient(90deg,#3B6FFF 0%,#7C3AED 55%,#06B6D4 100%)";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F8F9FC" }}>

      {/* ── Scrollable body ── */}
      <div style={{
        flex: 1, overflowY: "auto", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "24px 32px 16px", scrollbarWidth: "none",
      }}>

        {/* ──── Hero ──── */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "6px 16px", borderRadius: "100px", marginBottom: "14px",
            background: "linear-gradient(135deg,#EEF3FF 0%,#F3EEFF 100%)",
            border: "1px solid #C7D8FF", boxShadow: "0 2px 12px rgba(59,111,255,.1)",
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3B6FFF", display: "inline-block", animation: "fv-pulse 1.6s ease-in-out infinite" }} />
            <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#3B6FFF", letterSpacing: ".12em", textTransform: "uppercase" as const }}>
              AI · Powered Code Generator
            </span>
          </div>

          <h1 style={{ fontSize: "clamp(26px,3.6vw,38px)", fontWeight: 900, letterSpacing: "-.04em", lineHeight: 1.1, color: "#0A0E1A", margin: "0 0 8px" }}>
            {bankContent ? bankContent.title : (
              <>
                Build your application with{" "}
                <span style={{ display: "inline-block", background: brandGradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-.03em" }}>
                  {brandName}
                </span>
              </>
            )}
          </h1>

          <p style={{ fontSize: "13.5px", color: "#6B7A99", lineHeight: 1.6, margin: "0 auto 14px", maxWidth: "440px", fontWeight: 500 }}>
            {bankContent ? bankContent.desc : `Describe your app — ${brandName} architects, designs, and generates production-ready code in seconds.`}
          </p>
        </div>

        {/* ──── Suggestion cards ──── */}
        <div style={{ width: "100%", maxWidth: "660px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
          {suggestions.map((s) => (
            <button
              key={s.tag}
              onClick={() => onRun(s.text)}
              disabled={running}
              style={{
                textAlign: "left", padding: "13px 14px", borderRadius: "14px", background: "#FFFFFF",
                border: "1px solid #E8ECF4", boxShadow: "0 1px 3px rgba(13,17,23,.05)",
                cursor: running ? "not-allowed" : "pointer", opacity: running ? .45 : 1, transition: "all .18s ease",
              }}
              onMouseEnter={e => {
                if (running) return;
                const el = e.currentTarget as HTMLElement;
                el.style.background = s.bg; el.style.borderColor = s.border;
                el.style.boxShadow = `0 5px 18px ${s.dot}22`; el.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "#FFFFFF"; el.style.borderColor = "#E8ECF4";
                el.style.boxShadow = "0 1px 3px rgba(13,17,23,.05)"; el.style.transform = "translateY(0)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "6px" }}>
                <span style={{ fontSize: "15px" }}>{s.icon}</span>
                <span style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, padding: "2px 8px", borderRadius: "6px", background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{s.tag}</span>
              </div>
              <p style={{ fontSize: "11px", lineHeight: 1.55, color: "#6B7A99", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{s.text}</p>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: "100%", maxWidth: "660px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ flex: 1, height: "1px", background: "#E8ECF4" }} />
          <span style={{ fontSize: "10px", fontWeight: 600, color: "#C4CBDA", letterSpacing: ".1em", textTransform: "uppercase" as const, whiteSpace: "nowrap" }}>
            or describe your own
          </span>
          <div style={{ flex: 1, height: "1px", background: "#E8ECF4" }} />
        </div>
      </div>

      {/* ── Sticky prompt bar ── */}
      <div style={{ flexShrink: 0, padding: "12px 32px 16px", borderTop: "1px solid #EAECF2", background: "#FFFFFF", boxShadow: "0 -2px 14px rgba(13,17,40,.06)" }}>
        <div style={{ maxWidth: "660px", margin: "0 auto" }}>
          <PromptInput onSubmit={onRun} disabled={running} />
        </div>
      </div>

      <style>{`@keyframes fv-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
    </div>
  );
}
