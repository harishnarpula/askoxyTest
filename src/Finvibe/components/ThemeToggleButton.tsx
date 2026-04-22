import type { ThemeMode } from "../hooks/useTheme";

interface ThemeToggleButtonProps {
  onToggleTheme: () => void;
  theme: ThemeMode;
}

export function ThemeToggleButton({ onToggleTheme, theme }: ThemeToggleButtonProps) {
  const isDark = theme === "dark";

  return (
    <button
      onClick={onToggleTheme}
      className="theme-toggle-switch"
      title={isDark ? "Switch to Light" : "Switch to Dark"}
      aria-label={isDark ? "Switch to Light" : "Switch to Dark"}
      type="button"
      style={{
        position: "relative",
        width: "52px",
        height: "28px",
        borderRadius: "14px",
        padding: "3px",
        background: isDark ? "var(--accent-primary)" : "var(--surface-soft)",
        border: `1px solid ${isDark ? "var(--accent-border)" : "var(--surface-soft-border)"}`,
        cursor: "pointer",
        transition: "all 0.3s ease",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: isDark ? "#fff" : "var(--accent-primary)",
          transform: isDark ? "translateX(24px)" : "translateX(0)",
          transition: "transform 0.3s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        }}
      >
        {isDark ? (
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.536a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707zM2.05 6.464A1 1 0 103.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm2.95-7.95a1 1 0 11-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zm-2.828 13.856a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707zM3 11a1 1 0 100-2H2a1 1 0 100 2h1z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
    </button>
  );
}
