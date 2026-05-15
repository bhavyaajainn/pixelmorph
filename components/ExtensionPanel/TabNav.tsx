"use client";

import { usePixelMorph } from "@/context/PixelMorphContext";
import type { TabId } from "@/types";

const TABS: { id: TabId; label: string }[] = [
  { id: "dom",       label: "DOM" },
  { id: "colors",    label: "Colors" },
  { id: "text",      label: "Text" },
  { id: "resources", label: "Assets" },
];

export default function TabNav() {
  const { activeTab, setActiveTab } = usePixelMorph();

  return (
    <nav style={{ display: "flex", background: "var(--surface2)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
      {TABS.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: "9px 0",
              background: "none", border: "none", cursor: "pointer",
              fontSize: 11,
              fontFamily: "var(--font-syne), sans-serif",
              fontWeight: isActive ? 700 : 500,
              color: isActive ? "var(--text)" : "var(--text-muted)",
              borderBottom: `2px solid ${isActive ? "var(--accent2)" : "transparent"}`,
              transition: "color 150ms, border-color 150ms",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
