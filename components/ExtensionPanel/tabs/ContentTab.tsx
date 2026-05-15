"use client";

import { useState } from "react";
import { usePixelMorph } from "@/context/PixelMorphContext";

function Section({ children, noBorder }: { children: React.ReactNode; noBorder?: boolean }) {
  return (
    <div style={{
      padding: "14px 16px",
      borderBottom: noBorder ? "none" : "1px solid var(--border)",
    }}>{children}</div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase" as const,
      color: "var(--text-muted)",
      marginBottom: 10,
    }}>{children}</div>
  );
}

export default function ContentTab() {
  const {
    textOverrides, removeTextOverride, addTextOverride,
    brandFind, brandReplace, setBrandFind, setBrandReplace,
  } = usePixelMorph();

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [addingOverride, setAddingOverride] = useState(false);
  const [newSelector, setNewSelector] = useState("");
  const [newOriginal, setNewOriginal] = useState("");
  const [newReplacement, setNewReplacement] = useState("");

  const handleAddOverride = () => {
    if (newSelector && newReplacement) {
      addTextOverride({ selector: newSelector, original: newOriginal, replacement: newReplacement });
      setNewSelector(""); setNewOriginal(""); setNewReplacement("");
      setAddingOverride(false);
    }
  };

  return (
    <div>
      {/* Text Overrides */}
      <Section>
        <SectionTitle>Text Overrides</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {textOverrides.map(ov => (
            <div
              key={ov.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "10px 12px",
                background: "var(--surface3)",
                borderRadius: "var(--radius)",
                border: "1px solid transparent",
              }}
            >
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{
                  fontFamily: "var(--font-dm-mono), monospace",
                  fontSize: 10,
                  color: "var(--accent2)",
                  marginBottom: 4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap" as const,
                }}>{ov.selector}</div>
                <div style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  textDecoration: "line-through",
                  marginBottom: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap" as const,
                }}>{ov.original}</div>
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap" as const,
                }}>{ov.replacement}</div>
              </div>
              <button
                onClick={() => removeTextOverride(ov.id)}
                onMouseEnter={() => setHoveredId(ov.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 16,
                  lineHeight: 1,
                  color: hoveredId === ov.id ? "var(--accent3)" : "var(--text-muted)",
                  padding: "0 2px",
                  flexShrink: 0,
                  transition: "color 150ms",
                }}
              >×</button>
            </div>
          ))}
        </div>

        {/* Inline add form */}
        {addingOverride ? (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            <input
              placeholder="CSS selector (e.g. h1.hero)"
              value={newSelector}
              onChange={e => setNewSelector(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Original text"
              value={newOriginal}
              onChange={e => setNewOriginal(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Replacement text"
              value={newReplacement}
              onChange={e => setNewReplacement(e.target.value)}
              style={{ ...inputStyle, borderColor: "var(--accent2)", color: "var(--accent2)" }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={handleAddOverride} style={primaryBtnStyle}>Add</button>
              <button onClick={() => setAddingOverride(false)} style={ghostBtnStyle}>Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingOverride(true)}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "9px",
              background: "none",
              border: "1.5px dashed var(--border-hover)",
              borderRadius: "var(--radius)",
              color: "var(--text-muted)",
              fontSize: 12,
              fontFamily: "var(--font-syne), sans-serif",
              cursor: "pointer",
            }}
          >Click element to override text</button>
        )}
      </Section>

      {/* Brand Name Replace */}
      <Section noBorder>
        <SectionTitle>Brand Name Replace</SectionTitle>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            value={brandFind}
            onChange={e => setBrandFind(e.target.value)}
            placeholder="Original"
            style={inputStyle}
          />
          <input
            value={brandReplace}
            onChange={e => setBrandReplace(e.target.value)}
            placeholder="Replace"
            style={{ ...inputStyle, borderColor: "var(--accent2)", color: "var(--accent2)" }}
          />
        </div>
        <button style={{ ...primaryBtnStyle, width: "100%" }}>
          Replace All Instances
        </button>
      </Section>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px 10px",
  background: "var(--surface3)",
  border: "1px solid var(--border-hover)",
  borderRadius: "var(--radius)",
  color: "var(--text)",
  fontSize: 12,
  fontFamily: "var(--font-syne), sans-serif",
  outline: "none",
  width: "100%",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "9px 16px",
  background: "var(--accent2)",
  border: "none",
  borderRadius: "var(--radius)",
  color: "#fff",
  fontSize: 13,
  fontFamily: "var(--font-syne), sans-serif",
  fontWeight: 700,
  cursor: "pointer",
};

const ghostBtnStyle: React.CSSProperties = {
  padding: "9px 16px",
  background: "none",
  border: "1px solid var(--border-hover)",
  borderRadius: "var(--radius)",
  color: "var(--text-muted)",
  fontSize: 13,
  fontFamily: "var(--font-syne), sans-serif",
  fontWeight: 600,
  cursor: "pointer",
};
