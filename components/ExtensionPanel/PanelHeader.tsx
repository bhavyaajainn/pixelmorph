"use client";

import { usePixelMorph } from "@/context/PixelMorphContext";

export default function PanelHeader() {
  const { isEnabled, setEnabled, currentSite } = usePixelMorph();

  return (
    <header style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 16px",
      background: "var(--surface2)",
      borderBottom: "1px solid var(--border)",
      flexShrink: 0,
    }}>
      {/* Logo mark */}
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: "linear-gradient(135deg, var(--accent2), var(--accent))",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 800, color: "#0C0C0E", flexShrink: 0,
      }}>P</div>

      {/* Name */}
      <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", letterSpacing: "-0.02em", flex: 1 }}>
        PixelMorph
      </span>

      {/* Site */}
      {currentSite !== "—" && (
        <span style={{
          fontSize: 11, color: "var(--muted)",
          background: "var(--surface3)",
          padding: "3px 8px", borderRadius: 6,
          maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{currentSite}</span>
      )}

      {/* Toggle */}
      <button
        onClick={() => setEnabled(!isEnabled)}
        title={isEnabled ? "Disable all changes" : "Enable changes"}
        style={{
          width: 40, height: 22, borderRadius: 11,
          border: "none", cursor: "pointer",
          position: "relative",
          background: isEnabled ? "var(--accent)" : "var(--surface3)",
          transition: "background 200ms", flexShrink: 0,
        }}
      >
        <span style={{
          position: "absolute", top: 3,
          left: isEnabled ? 20 : 3,
          width: 16, height: 16, borderRadius: "50%",
          background: isEnabled ? "#0C0C0E" : "var(--muted)",
          transition: "left 200ms",
        }} />
      </button>
    </header>
  );
}
