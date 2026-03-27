import { useState, KeyboardEvent } from "react";

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

  /* ─── COMPACT MODE (shown in top bar while generating) ─── */
  if (compact) {
    return (
      <div
        className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl w-full"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          style={{ opacity: 0.4, flexShrink: 0 }}
        >
          <circle cx="7" cy="7" r="6" stroke="white" strokeWidth="1.5" />
          <path
            d="M4.5 7h5M7 4.5v5"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          disabled={disabled}
          placeholder={
            disabled ? "Generating your app…" : "Describe a new app to build…"
          }
          className="flex-1 bg-transparent text-sm outline-none disabled:cursor-not-allowed"
          style={{
            color: disabled ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.8)",
          }}
        />

        {value.trim() && !disabled && (
          <button
            onClick={handleSubmit}
            className="shrink-0 px-3 py-1 rounded-lg text-xs font-bold text-white transition-all duration-150"
            style={{ background: "linear-gradient(135deg, #3B82F6, #6366F1)" }}
          >
            Build
          </button>
        )}

        {disabled && (
          <span
            className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin shrink-0"
            style={{
              borderColor: "rgba(99,102,241,0.5)",
              borderTopColor: "transparent",
            }}
          />
        )}
      </div>
    );
  }

  /* ─── FULL MODE (shown on landing page) ─── */
  const canSubmit = !disabled && value.trim();

  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-2xl transition-all duration-200"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
      onFocusCapture={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor =
          "rgba(99,102,241,0.5)";
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 0 0 3px rgba(99,102,241,0.1)";
      }}
      onBlurCapture={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor =
          "rgba(255,255,255,0.1)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        disabled={disabled}
        placeholder="Describe the app you want to build… (e.g. Build a P2P lending platform)"
        rows={1}
        className="flex-1 bg-transparent text-sm resize-none focus:outline-none disabled:opacity-50 leading-relaxed self-center"
        style={{
          color: "rgba(255,255,255,0.85)",
          minHeight: "24px",
          maxHeight: "96px",
          overflowY: "auto",
        }}
        onInput={(e) => {
          const el = e.currentTarget;
          el.style.height = "auto";
          el.style.height = Math.min(el.scrollHeight, 96) + "px";
        }}
      />

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed self-end"
        style={{
          background: canSubmit
            ? "linear-gradient(135deg, #3B82F6, #6366F1)"
            : "rgba(255,255,255,0.08)",
          boxShadow: canSubmit ? "0 0 16px rgba(99,102,241,0.3)" : "none",
          marginBottom: "1px",
        }}
      >
        {disabled ? (
          <>
            <span
              className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
              style={{
                borderColor: "rgba(255,255,255,0.6)",
                borderTopColor: "transparent",
              }}
            />
            Building…
          </>
        ) : (
          <>⚡ Build</>
        )}
      </button>
    </div>
  );
}
