import { useState } from "react";
import type { KeyboardEvent } from "react";

interface Props {
  onSubmit: (prompt: string) => void;
  disabled: boolean;
  compact?: boolean;
}

export function PromptInput({ onSubmit, disabled, compact = false }: Props) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  /* ─── COMPACT MODE ─── */
  if (compact) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "8px 12px", borderRadius: "12px",
        background: "#FFFFFF", border: "1px solid #E4E8F4",
        boxShadow: "0 1px 4px rgba(13,17,23,.06)", width: "100%",
      }}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: .3 }}>
          <circle cx="7" cy="7" r="5.5" stroke="#0D1117" strokeWidth="1.5"/>
          <path d="M4.5 7h5M7 4.5v5" stroke="#0D1117" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
          disabled={disabled}
          placeholder={disabled ? "Generating your app…" : "Describe a new app…"}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            fontSize: "13px", color: disabled ? "#B0BACC" : "#0D1117", fontFamily: "inherit",
          }}
        />
        {value.trim() && !disabled && (
          <button onClick={handleSubmit} style={{
            padding: "4px 12px", borderRadius: "7px", border: "none",
            background: "linear-gradient(135deg,#3B6FFF,#7C3AED)",
            color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer", flexShrink: 0,
          }}>Build</button>
        )}
        {disabled && (
          <span style={{
            width: "13px", height: "13px", borderRadius: "50%",
            border: "2px solid #3B6FFF", borderTopColor: "transparent",
            display: "inline-block", animation: "fv-spin .7s linear infinite", flexShrink: 0,
          }}/>
        )}
        <style>{`@keyframes fv-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  /* ─── FULL MODE ─── */
  const canSubmit = !disabled && !!value.trim();

  return (
    <>
      <style>{`
        @keyframes fv-spin { to { transform: rotate(360deg); } }
        ::placeholder { color: #B0BACC; }
      `}</style>

      <div
        style={{
          background: "#FFFFFF",
          border: "1.5px solid #E4E8F4",
          borderRadius: "14px",
          padding: "10px 10px 8px 14px",
          boxShadow: "0 2px 10px rgba(13,17,40,.07)",
          transition: "border-color .2s, box-shadow .2s",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
        onFocusCapture={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = "#3B6FFF";
          el.style.boxShadow = "0 0 0 4px rgba(59,111,255,.09), 0 2px 10px rgba(13,17,40,.07)";
        }}
        onBlurCapture={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = "#E4E8F4";
          el.style.boxShadow = "0 2px 10px rgba(13,17,40,.07)";
        }}
      >
        {/* Textarea */}
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKey}
          disabled={disabled}
          placeholder="Describe the fintech app you want to build…"
          rows={1}
          style={{
            width: "100%", background: "transparent",
            border: "none", outline: "none", resize: "none",
            fontSize: "13.5px", lineHeight: "1.55",
            color: "#0D1117", minHeight: "22px", maxHeight: "88px",
            overflowY: "auto", fontFamily: "inherit",
          }}
          onInput={e => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 88) + "px";
          }}
        />

        {/* Toolbar row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "#D1D8E8", fontWeight: 500 }}>⏎ to build</span>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "7px 16px", borderRadius: "9px", border: "none",
              background: canSubmit
                ? "linear-gradient(135deg,#3B6FFF 0%,#7C3AED 100%)"
                : "#F0F2F8",
              color: canSubmit ? "#FFF" : "#C4CBDB",
              fontSize: "12.5px", fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed",
              boxShadow: canSubmit ? "0 3px 12px rgba(59,111,255,.28)" : "none",
              transition: "all .2s", letterSpacing: "-.01em", whiteSpace: "nowrap",
            }}
          >
            {disabled ? (
              <>
                <span style={{
                  width: "11px", height: "11px", borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,.4)",
                  borderTopColor: "transparent", display: "inline-block",
                  animation: "fv-spin .7s linear infinite",
                }}/>
                Building…
              </>
            ) : <>⚡ Build</>}
          </button>
        </div>
      </div>
    </>
  );
}