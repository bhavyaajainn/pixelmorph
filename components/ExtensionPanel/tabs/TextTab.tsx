"use client";

import { useState } from "react";
import { usePixelMorph } from "@/context/PixelMorphContext";
import { CaptureButton, ResetButton } from "./ColorsTab";

export default function TextTab() {
  const {
    isCapturing, captureError, captureText, resetText,
    textOverrides, removeTextOverride, updateTextOverride, addTextOverride,
    brandFind, brandReplace, setBrandFind, setBrandReplace,
  } = usePixelMorph();

  const [hovered, setHovered]               = useState<string | null>(null);
  const [addingOverride, setAddingOverride]  = useState(false);
  const [newSelector, setNewSelector]        = useState("");
  const [newOriginal, setNewOriginal]        = useState("");
  const [newReplacement, setNewReplacement]  = useState("");

  const hasText = textOverrides.length > 0;

  return (
    <div>
      {/* Capture */}
      <Section>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <CaptureButton
              label={hasText ? "↻ Recapture Page Text" : "Capture Full Page Text"}
              loading={isCapturing}
              onClick={captureText}
            />
          </div>
          {hasText && <ResetButton onClick={resetText} />}
        </div>
        {captureError && (
          <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(255,92,87,0.1)", borderRadius: "var(--radius)", border: "1px solid rgba(255,92,87,0.3)", fontSize: 11, color: "#FF5C57" }}>
            {captureError}
          </div>
        )}
        {!hasText && !isCapturing && !captureError && (
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5, textAlign: "center" }}>
            Scans headings, buttons and nav links from the active page.
          </p>
        )}
      </Section>

      {/* Text Overrides */}
      <Section>
        <Label>Text Overrides <span style={{ fontWeight: 400, opacity: 0.6 }}>({textOverrides.length})</span></Label>

        {textOverrides.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
            {textOverrides.map(ov => (
              <div key={ov.id} style={{ padding: "8px 10px", background: "var(--surface3)", borderRadius: "var(--radius)" }}>
                {/* Selector + remove */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 10, color: "var(--accent2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {ov.selector}
                  </span>
                  <button
                    onClick={() => removeTextOverride(ov.id)}
                    onMouseEnter={() => setHovered(ov.id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, lineHeight: 1, color: hovered === ov.id ? "#FF5C57" : "var(--text-muted)", padding: "0 2px", flexShrink: 0, transition: "color 150ms" }}
                  >×</button>
                </div>

                {/* Original — strikethrough */}
                <div style={{ fontSize: 11, color: "var(--text-muted)", textDecoration: "line-through", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 5 }}>
                  {ov.original}
                </div>

                {/* Replacement — always-visible editable input */}
                <input
                  value={ov.replacement !== ov.original ? ov.replacement : ""}
                  placeholder="Type replacement text…"
                  onChange={e => updateTextOverride(ov.id, e.target.value === "" ? ov.original : e.target.value)}
                  style={{
                    ...inputSt,
                    width: "100%",
                    borderColor: ov.replacement !== ov.original ? "var(--accent2)" : "var(--border-hover)",
                    color: ov.replacement !== ov.original ? "var(--accent)" : "var(--text-muted)",
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Inline add form */}
        {addingOverride ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input placeholder="CSS selector (e.g. h1, .hero-title)" value={newSelector} onChange={e => setNewSelector(e.target.value)} style={inputSt} />
            <input placeholder="Original text" value={newOriginal} onChange={e => setNewOriginal(e.target.value)} style={inputSt} />
            <input placeholder="Replacement text" value={newReplacement} onChange={e => setNewReplacement(e.target.value)} style={{ ...inputSt, borderColor: "var(--accent2)", color: "var(--accent2)" }} />
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => {
                if (newSelector && newReplacement) {
                  addTextOverride({ selector: newSelector, original: newOriginal, replacement: newReplacement });
                  setNewSelector(""); setNewOriginal(""); setNewReplacement(""); setAddingOverride(false);
                }
              }} style={primaryBtn}>Add</button>
              <button onClick={() => setAddingOverride(false)} style={ghostBtn}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingOverride(true)} style={{ width: "100%", padding: "8px", background: "none", border: "1.5px dashed var(--border-hover)", borderRadius: "var(--radius)", color: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-syne), sans-serif", cursor: "pointer" }}>
            + Add override manually
          </button>
        )}
      </Section>

      {/* Brand Replace */}
      <Section noBorder>
        <Label>Brand Name Replace</Label>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input value={brandFind}    onChange={e => setBrandFind(e.target.value)}    placeholder="Original brand" style={inputSt} />
          <input value={brandReplace} onChange={e => setBrandReplace(e.target.value)} placeholder="New brand"      style={{ ...inputSt, borderColor: "var(--accent2)", color: "var(--accent2)" }} />
        </div>
        <button style={{ ...primaryBtn, width: "100%" }}>Replace All Instances</button>
      </Section>
    </div>
  );
}

function Section({ children, noBorder }: { children: React.ReactNode; noBorder?: boolean }) {
  return <div style={{ padding: "12px 14px", borderBottom: noBorder ? "none" : "1px solid var(--border)" }}>{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>{children}</div>;
}

const inputSt: React.CSSProperties = {
  flex: 1, padding: "7px 9px",
  background: "var(--surface3)", border: "1px solid var(--border-hover)",
  borderRadius: "var(--radius)", color: "var(--text)", fontSize: 12,
  fontFamily: "var(--font-syne), sans-serif", outline: "none", width: "100%",
};
const primaryBtn: React.CSSProperties = {
  padding: "8px 14px", background: "var(--accent2)", border: "none",
  borderRadius: "var(--radius)", color: "#fff", fontSize: 12,
  fontFamily: "var(--font-syne), sans-serif", fontWeight: 700, cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  padding: "8px 14px", background: "none", border: "1px solid var(--border-hover)",
  borderRadius: "var(--radius)", color: "var(--text-muted)", fontSize: 12,
  fontFamily: "var(--font-syne), sans-serif", fontWeight: 600, cursor: "pointer",
};
