"use client";

import { useState } from "react";
import { usePixelMorph } from "@/context/PixelMorphContext";

export default function ColorsTab() {
  const {
    selectedElementInfo, isPicking, isCapturing, captureError,
    startElementPicker, cancelElementPicker, captureColors, resetColors,
    colorTokens, updateColorToken, addColorToken,
    fontRoles, activeFontId, setActiveFont,
    borderRadius, setBorderRadius,
    paddingScale, setPaddingScale,
    fontScale, setFontScale,
  } = usePixelMorph();

  const [editingId, setEditingId] = useState<string | null>(null);
  const hasColors = colorTokens.length > 0;

  return (
    <div>
      {/* ── Element Picker ───────────────────────────────────── */}
      <Section>
        <div
          onClick={() => isPicking ? cancelElementPicker() : startElementPicker()}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 12px",
            border: `1.5px dashed ${isPicking ? "var(--accent)" : "var(--border-hover)"}`,
            borderRadius: "var(--radius)", cursor: "pointer",
            color: isPicking ? "var(--accent)" : "var(--text-muted)",
            fontSize: 12, transition: "border-color 150ms, color 150ms",
          }}
        >
          <PickerIcon active={isPicking} />
          <span style={{ flex: 1 }}>
            {isPicking ? "Click element on page… (Esc = cancel)" : "Inspect element on page"}
          </span>
        </div>

        {selectedElementInfo && !isPicking && (
          <div style={{ marginTop: 8, padding: "10px 12px", background: "var(--surface3)", borderRadius: "var(--radius)", border: "1px solid var(--border-hover)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Badge text={selectedElementInfo.tag} accent={selectedElementInfo.tag === "body"} />
              <span style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedElementInfo.selector}
              </span>
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 6 }}>
              <Kv k="W" v={`${selectedElementInfo.dimensions.width}px`} />
              <Kv k="H" v={`${selectedElementInfo.dimensions.height}px`} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <ColorRow label="Background" value={selectedElementInfo.styles.backgroundColor} />
              <ColorRow label="Color" value={selectedElementInfo.styles.color} />
              <Kv k="Font" v={selectedElementInfo.styles.fontSize + " / " + selectedElementInfo.styles.fontWeight} />
              <Kv k="Radius" v={selectedElementInfo.styles.borderRadius} />
            </div>
          </div>
        )}
      </Section>

      {/* ── Capture Button ───────────────────────────────────── */}
      <Section>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <CaptureButton
              label={hasColors ? "↻ Recapture Page Colors" : "Capture Full Page Colors"}
              loading={isCapturing}
              onClick={captureColors}
            />
          </div>
          {hasColors && <ResetButton onClick={resetColors} />}
        </div>
        {captureError && (
          <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(255,92,87,0.1)", borderRadius: "var(--radius)", border: "1px solid rgba(255,92,87,0.3)", fontSize: 11, color: "#FF5C57" }}>
            {captureError}
          </div>
        )}
        {!hasColors && !isCapturing && !captureError && (
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5, textAlign: "center" }}>
            Extracts colors and fonts from the active page.
          </p>
        )}
      </Section>

      {/* ── Color Tokens ─────────────────────────────────────── */}
      {hasColors && (
        <Section>
          <Label>Color System</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {colorTokens.map(token => (
              <div
                key={token.id}
                onClick={() => setEditingId(editingId === token.id ? null : token.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", background: "var(--surface3)",
                  borderRadius: "var(--radius)",
                  border: `1px solid ${editingId === token.id ? "var(--accent2)" : "transparent"}`,
                  cursor: "pointer", transition: "border-color 150ms",
                }}
              >
                <div style={{ width: 24, height: 24, borderRadius: 4, background: token.hex, flexShrink: 0, border: "1px solid rgba(255,255,255,0.1)" }} />
                <div style={{ overflow: "hidden", flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{token.label}</div>
                  <div style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 10, color: "var(--text-muted)" }}>{token.hex}</div>
                </div>
              </div>
            ))}
          </div>

          {editingId && (() => {
            const t = colorTokens.find(x => x.id === editingId);
            return t ? (
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                <input type="color" value={t.hex} onChange={e => updateColorToken(editingId, e.target.value)}
                  style={{ width: 40, height: 32, borderRadius: 6, border: "1px solid var(--border-hover)", cursor: "pointer", background: "none", padding: 2 }} />
                <span style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 12, color: "var(--text-muted)" }}>{t.hex}</span>
              </div>
            ) : null;
          })()}

          <button onClick={addColorToken} style={{ width: "100%", marginTop: 10, padding: "8px", background: "none", border: "1.5px dashed var(--border-hover)", borderRadius: "var(--radius)", color: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-syne), sans-serif", cursor: "pointer" }}>
            + Add color token
          </button>
        </Section>
      )}

      {/* ── Typography ────────────────────────────────────────── */}
      {fontRoles.length > 0 && (
        <Section>
          <Label>Typography</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {fontRoles.map(font => {
              const active = font.id === activeFontId;
              return (
                <div key={font.id} onClick={() => setActiveFont(font.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "var(--surface3)", borderRadius: "var(--radius)", border: `1px solid ${active ? "var(--accent2)" : "transparent"}`, cursor: "pointer", transition: "border-color 150ms" }}>
                  <span style={{ fontFamily: `'${font.family}', sans-serif`, fontSize: 20, fontWeight: 700, color: "var(--text)", width: 36, textAlign: "center", flexShrink: 0 }}>Aa</span>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{font.family}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{font.roleLabel}</div>
                  </div>
                  {active && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "rgba(123,97,255,0.15)", color: "var(--accent2)", flexShrink: 0 }}>ACTIVE</span>}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Spacing & Scale ───────────────────────────────────── */}
      <Section noBorder>
        <Label>Spacing &amp; Scale</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Slider label="Border Radius" value={borderRadius} min={0}  max={24}  unit="px" onChange={setBorderRadius} />
          <Slider label="Padding Scale" value={paddingScale} min={0}  max={32}  unit="px" onChange={setPaddingScale} />
          <Slider label="Font Scale"    value={fontScale}    min={80} max={130} unit="%" onChange={setFontScale} />
        </div>
      </Section>
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function Section({ children, noBorder }: { children: React.ReactNode; noBorder?: boolean }) {
  return <div style={{ padding: "12px 14px", borderBottom: noBorder ? "none" : "1px solid var(--border)" }}>{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>{children}</div>;
}

function Badge({ text, accent }: { text: string; accent?: boolean }) {
  return (
    <span style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3, flexShrink: 0, background: accent ? "rgba(200,245,66,0.15)" : "rgba(123,97,255,0.15)", color: accent ? "var(--accent)" : "var(--accent2)" }}>
      {text}
    </span>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{k}</span>
      <span style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 10, color: "var(--text)" }}>{v}</span>
    </div>
  );
}

function ColorRow({ label, value }: { label: string; value: string }) {
  const isReal = value && value !== "rgba(0, 0, 0, 0)";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {isReal && <div style={{ width: 10, height: 10, borderRadius: 2, background: value, border: "1px solid rgba(255,255,255,0.15)" }} />}
        <span style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 10, color: "var(--text)" }}>{value || "—"}</span>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
        <span style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 11, color: "var(--accent)" }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }} />
    </div>
  );
}

function PickerIcon({ active }: { active: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M5.5 1L1 5.5L7 7.5L5.5 1Z" stroke={active ? "var(--accent)" : "currentColor"} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7.5 7.5L11 13" stroke={active ? "var(--accent)" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px",
        background: "none",
        border: "1px solid rgba(255,92,87,0.3)",
        borderRadius: "var(--radius)",
        color: "#FF5C57",
        fontSize: 11,
        fontFamily: "var(--font-syne), sans-serif",
        fontWeight: 600,
        cursor: "pointer",
        transition: "border-color 150ms, background 150ms",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,92,87,0.08)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
    >
      Reset
    </button>
  );
}

export function CaptureButton({ label, loading, onClick }: { label: string; loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        width: "100%", padding: "11px",
        background: loading ? "var(--surface3)" : "linear-gradient(135deg,var(--accent2),#5A4FD4)",
        border: "none", borderRadius: "var(--radius)",
        color: "#fff", fontSize: 12,
        fontFamily: "var(--font-syne), sans-serif", fontWeight: 700,
        cursor: loading ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        opacity: loading ? 0.7 : 1, transition: "opacity 150ms",
      }}
    >
      {loading ? <><Spinner /> Scanning page…</> : label}
    </button>
  );
}

function Spinner() {
  return <span style={{ width: 11, height: 11, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />;
}
