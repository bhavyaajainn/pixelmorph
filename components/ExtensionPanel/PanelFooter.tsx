"use client";

import { usePixelMorph } from "@/context/PixelMorphContext";

export default function PanelFooter() {
  const { nodeChanges, undoAll, selectedNodeId } = usePixelMorph();
  const count = Object.keys(nodeChanges).length;

  if (count === 0 || selectedNodeId !== null) return null;

  return (
    <footer style={{
      padding: "12px 16px",
      background: "var(--surface2)", borderTop: "1px solid var(--border)",
      flexShrink: 0, animation: "fadeIn 200ms ease",
    }}>
      <button
        onClick={undoAll}
        style={{
          width: "100%", padding: "10px 16px",
          background: "none", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", color: "var(--muted)",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}
      >
        Undo All ({count})
      </button>
    </footer>
  );
}
