"use client";

import { useState } from "react";
import { usePixelMorph } from "@/context/PixelMorphContext";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}>
      {children}
    </div>
  );
}

function Section({ children, noBorder }: { children: React.ReactNode; noBorder?: boolean }) {
  return (
    <div style={{ padding: "14px 16px", borderBottom: noBorder ? "none" : "1px solid var(--border)" }}>
      {children}
    </div>
  );
}

export default function StyleTab() {
  const {
    selectedElementInfo, isPicking, isCapturing,
    startElementPicker, cancelElementPicker, capturePageStyles,
    colorTokens, updateColorToken, addColorToken,
    fontRoles, activeFontId, setActiveFont,
    borderRadius, setBorderRadius,
    paddingScale, setPaddingScale,
    fontScale, setFontScale,
  } = usePixelMorph();

  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const hasData = colorTokens.length > 0;

  return (
    <div>
      {/* ── Element Picker ── */}
      <Section>
        <div
          onClick={() => isPicking ? cancelElementPicker() : startElementPicker()}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px",
            border: `1.5px dashed ${isPicking ? "var(--accent)" : "var(--border-hover)"}`,
            borderRadius: "var(--radius)",
            cursor: "pointer",
            color: isPicking ? "var(--accent)" : "var(--text-muted)",
            fontSize: 13,
            transition: "border-color 150ms, color 150ms",
          }}
        >
          <CursorIcon active={isPicking} />
          <span style={{ flex: 1 }}>
            {isPicking ? "Click an element… (Esc to cancel)" : "Pick element on page"}
          </span>
        </div>

        {selectedElementInfo && !isPicking && (
          <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--surface3)", borderRadius: "var(--radius)", border: "1px solid var(--border-hover)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Tag text={selectedElementInfo.tag} accent={selectedElementInfo.tag === "body"} />
              <span style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedElementInfo.selector}
              </span>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              <Chip label="W" value={`${selectedElementInfo.dimensions.width}px`} />
              <Chip label="H" value={`${selectedElementInfo.dimensions.height}px`} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <StyleRow label="Background" value={selectedElementInfo.styles.backgroundColor} isColor />
              <StyleRow label="Color"      value={selectedElementInfo.styles.color} isColor />
              <StyleRow label="Font size"  value={selectedElementInfo.styles.fontSize} />
              <StyleRow label="Radius"     value={selectedElementInfo.styles.borderRadius} />
            </div>
          </div>
        )}
      </Section>

      {/* ── Capture Full Page ── */}
      <Section>
        <button
          onClick={capturePageStyles}
          disabled={isCapturing}
          style={{
            width: "100%",
            padding: "12px",
            background: isCapturing ? "var(--surface3)" : "linear-gradient(135deg, var(--accent2), #5A4FD4)",
            border: "none",
            borderRadius: "var(--radius)",
            color: "#fff",
            fontSize: 13,
            fontFamily: "var(--font-syne), sans-serif",
            fontWeight: 700,
            cursor: isCapturing ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: isCapturing ? 0.7 : 1,
            transition: "opacity 150ms",
          }}
        >
          {isCapturing ? (
            <><Spinner /> Capturing styles…</>
          ) : (
            <>{hasData ? "↻ Recapture Page Styles" : "Capture Full Page Styles"}</>
          )}
        </button>
        {!hasData && !isCapturing && (
          <p style={{ margin: "10px 0 0", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5, textAlign: "center" }}>
            Scans the active page and imports its colors, fonts, and text into PixelMorph.
          </p>
        )}
      </Section>

      {/* ── Color System (only when captured) ── */}
      {hasData && (
        <Section>
          <SectionTitle>Color System</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {colorTokens.map(token => (
              <div
                key={token.id}
                onClick={() => setEditingColorId(editingColorId === token.id ? null : token.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px",
                  background: "var(--surface3)",
                  borderRadius: "var(--radius)",
                  border: `1px solid ${editingColorId === token.id ? "var(--accent2)" : "transparent"}`,
                  cursor: "pointer",
                  transition: "border-color 150ms",
                }}
              >
                <div style={{ width: 24, height: 24, borderRadius: 4, background: token.hex, flexShrink: 0, border: "1px solid rgba(255,255,255,0.1)" }} />
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{token.label}</div>
                  <div style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 10, color: "var(--text-muted)" }}>{token.hex}</div>
                </div>
              </div>
            ))}
          </div>

          {editingColorId && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="color"
                value={colorTokens.find(t => t.id === editingColorId)?.hex ?? "#000000"}
                onChange={e => updateColorToken(editingColorId, e.target.value)}
                style={{ width: 40, height: 32, borderRadius: 6, border: "1px solid var(--border-hover)", cursor: "pointer", background: "none", padding: 2 }}
              />
              <span style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 12, color: "var(--text-muted)" }}>
                {colorTokens.find(t => t.id === editingColorId)?.hex}
              </span>
            </div>
          )}

          <button onClick={addColorToken} style={{
            width: "100%", marginTop: 10, padding: "8px",
            background: "none", border: "1.5px dashed var(--border-hover)",
            borderRadius: "var(--radius)", color: "var(--text-muted)",
            fontSize: 12, fontFamily: "var(--font-syne), sans-serif", cursor: "pointer",
          }}>
            + Add color token
          </button>
        </Section>
      )}

      {/* ── Typography (only when captured) ── */}
      {hasData && fontRoles.length > 0 && (
        <Section>
          <SectionTitle>Typography</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {fontRoles.map(font => {
              const isActive = font.id === activeFontId;
              return (
                <div
                  key={font.id}
                  onClick={() => setActiveFont(font.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px",
                    background: "var(--surface3)",
                    borderRadius: "var(--radius)",
                    border: `1px solid ${isActive ? "var(--accent2)" : "transparent"}`,
                    cursor: "pointer",
                    transition: "border-color 150ms",
                  }}
                >
                  <span style={{ fontFamily: `'${font.family}', sans-serif`, fontSize: 22, fontWeight: 700, color: "var(--text)", width: 38, textAlign: "center", flexShrink: 0 }}>Aa</span>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{font.family}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{font.roleLabel}</div>
                  </div>
                  {isActive && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(123,97,255,0.15)", color: "var(--accent2)", letterSpacing: "0.05em", flexShrink: 0 }}>
                      Active
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Spacing & Scale (always visible) ── */}
      <Section noBorder>
        <SectionTitle>Spacing &amp; Scale</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SliderRow label="Border Radius" value={borderRadius} min={0}  max={24}  unit="px" onChange={setBorderRadius} />
          <SliderRow label="Padding Scale" value={paddingScale} min={0}  max={32}  unit="px" onChange={setPaddingScale} />
          <SliderRow label="Font Scale"    value={fontScale}    min={80} max={130} unit="%" onChange={setFontScale} />
        </div>
      </Section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Tag({ text, accent }: { text: string; accent?: boolean }) {
  return (
    <span style={{
      fontFamily: "var(--font-dm-mono), monospace", fontSize: 10, fontWeight: 700,
      padding: "2px 7px", borderRadius: 4, flexShrink: 0,
      background: accent ? "rgba(200,245,66,0.15)" : "rgba(123,97,255,0.15)",
      color: accent ? "var(--accent)" : "var(--accent2)",
    }}>{text}</span>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700 }}>{label}</span>
      <span style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 11, color: "var(--text)" }}>{value}</span>
    </div>
  );
}

function StyleRow({ label, value, isColor }: { label: string; value: string; isColor?: boolean }) {
  const hex = isColor ? (() => { try { const c = value; return c && c !== "rgba(0, 0, 0, 0)" ? c : null; } catch (_) { return null; } })() : null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {hex && <div style={{ width: 10, height: 10, borderRadius: 2, background: hex, border: "1px solid rgba(255,255,255,0.15)", flexShrink: 0 }} />}
        <span style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 10, color: "var(--text)" }}>{value || "—"}</span>
      </div>
    </div>
  );
}

function SliderRow({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
        <span style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 12, color: "var(--accent)" }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }} />
    </div>
  );
}

function CursorIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5.5 1L1 5.5L7 7.5L5.5 1Z" stroke={active ? "var(--accent)" : "currentColor"} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7.5 7.5L11 13" stroke={active ? "var(--accent)" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
      borderRadius: "50%", display: "inline-block",
      animation: "spin 0.6s linear infinite",
    }} />
  );
}
