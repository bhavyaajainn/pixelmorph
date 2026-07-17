"use client";

import { usePixelMorph } from "@/context/PixelMorphContext";

export default function PanelFooter() {
  const {
    nodeChanges, undoAll, selectedNodeId,
    aiRedesign, isAILoading, aiError, aiScreenshot,
  } = usePixelMorph();

  const undoCount = Object.keys(nodeChanges).length;
  const showUndo  = undoCount > 0 && selectedNodeId === null;

  return (
    <footer style={{
      padding: "12px 16px",
      background: "var(--surface2)",
      borderTop: "1px solid var(--border)",
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      animation: "fadeIn 200ms ease",
    }}>

      {/* AI Redesign button */}
      <button
        onClick={() => aiRedesign()}
        disabled={isAILoading}
        style={{
          width: "100%",
          padding: "10px 16px",
          background: isAILoading ? "var(--surface3)" : "linear-gradient(135deg, var(--accent2), var(--accent))",
          border: "none",
          borderRadius: "var(--radius)",
          color: isAILoading ? "var(--muted)" : "#0C0C0E",
          fontSize: 13,
          fontWeight: 700,
          cursor: isAILoading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          transition: "opacity 150ms",
        }}
      >
        {isAILoading ? (
          <>
            <span style={{
              width: 13, height: 13, borderRadius: "50%",
              border: "2px solid var(--muted)",
              borderTopColor: "transparent",
              animation: "spin 0.7s linear infinite",
              display: "inline-block",
            }} />
            Redesigning…
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            AI Redesign
          </>
        )}
      </button>

      {/* Error */}
      {aiError && (
        <p style={{
          margin: 0, fontSize: 11, color: "var(--accent3)",
          lineHeight: 1.4, textAlign: "center",
        }}>
          {aiError}
        </p>
      )}

      {/* Screenshot sent to Gemini */}
      {aiScreenshot && (
        <div style={{ borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10, color: "var(--muted)", padding: "4px 8px", background: "var(--surface3)" }}>
            Screenshot sent to Gemini
          </div>
          <img src={aiScreenshot} alt="Gemini input" style={{ width: "100%", display: "block" }} />
        </div>
      )}

      {/* Undo All */}
      {showUndo && (
        <button
          onClick={undoAll}
          style={{
            width: "100%", padding: "8px 16px",
            background: "none", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", color: "var(--muted)",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          Undo All ({undoCount})
        </button>
      )}
    </footer>
  );
}
