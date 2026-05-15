"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { usePixelMorph } from "@/context/PixelMorphContext";
import type { DOMNode, NodeChange } from "@/types";

// ── Helpers ────────────────────────────────────────────────────────────────────

function rgbToHex(color: string): string {
  if (!color || color === "rgba(0, 0, 0, 0)" || color === "transparent") return "";
  if (color.startsWith("#")) return color.toUpperCase();
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return "";
  return "#" + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function parsePx(v: string, fallback = 0) { return Math.round(parseFloat(v)) || fallback; }

function findNode(tree: DOMNode | null, id: number): DOMNode | null {
  if (!tree) return null;
  if (tree.id === id) return tree;
  for (const c of tree.children) { const f = findNode(c, id); if (f) return f; }
  return null;
}

// ── DOM scan grouping (used for full-page scan view) ───────────────────────────

interface Group { label: string; icon: string; nodes: DOMNode[] }

function buildGroups(tree: DOMNode): Group[] {
  const map: Record<string, Group> = {
    headings: { label: "Headings",         icon: "H",  nodes: [] },
    buttons:  { label: "Buttons & Links",  icon: "⬡",  nodes: [] },
    images:   { label: "Images",           icon: "🖼", nodes: [] },
    text:     { label: "Text Blocks",      icon: "¶",  nodes: [] },
  };
  const seenText = new Set<string>();

  function walk(node: DOMNode) {
    const t = node.tag;
    const txt = (node.text || "").trim();
    if (["h1","h2","h3","h4","h5","h6"].includes(t) && txt) {
      if (!seenText.has(txt)) { seenText.add(txt); map.headings.nodes.push(node); }
    } else if (t === "button" || (t === "a" && txt && txt.length < 60)) {
      if (!seenText.has(txt)) { seenText.add(txt); map.buttons.nodes.push(node); }
    } else if (t === "img") {
      map.images.nodes.push(node);
    } else if (t === "p" && txt && txt.length > 5) {
      if (!seenText.has(txt.slice(0, 40))) { seenText.add(txt.slice(0, 40)); map.text.nodes.push(node); }
    }
    node.children.forEach(walk);
  }

  walk(tree);
  return Object.values(map).filter(g => g.nodes.length > 0);
}

// ── Box capture helpers ────────────────────────────────────────────────────────

function friendlyType(node: DOMNode): string {
  const t = node.tag;
  if (t === "h1") return "Main Heading";
  if (t === "h2") return "Heading";
  if (["h3","h4","h5","h6"].includes(t)) return "Subheading";
  if (t === "button") return "Button";
  if (t === "a") return "Link";
  if (t === "p") return "Paragraph";
  if (t === "img") return "Image";
  if (t === "li") return "List Item";
  if (t === "label") return "Label";
  if (["span","em","strong"].includes(t)) return "Text";
  if (!node.text && rgbToHex(node.styles.backgroundColor)) return "Container";
  return "Element";
}

function buildSteps(nodes: DOMNode[]): DOMNode[] {
  // Sort largest (outermost) first so the user drills inward
  const sorted = [...nodes].sort(
    (a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height
  );
  const seenText = new Set<string>();
  const result: DOMNode[] = [];

  for (const node of sorted) {
    if (node.rect.width < 20 || node.rect.height < 20) continue;
    const txt = (node.text ?? "").trim();
    const tKey = txt.slice(0, 40);
    if (txt && seenText.has(tKey)) continue;
    if (txt) seenText.add(tKey);
    const hasBg = !!rgbToHex(node.styles.backgroundColor);
    if (!txt && !hasBg) continue;
    result.push(node);
    if (result.length >= 10) break;
  }
  return result;
}

// ── Shared small components ────────────────────────────────────────────────────

function Swatch({ color, label }: { color: string; label: string }) {
  const hex = rgbToHex(color);
  if (!hex) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ width: 14, height: 14, borderRadius: 4, background: hex, border: "1px solid rgba(255,255,255,0.15)", flexShrink: 0 }} />
      <span style={{ fontFamily: "monospace", fontSize: 10, color: "var(--muted)" }}>{hex}</span>
    </div>
  );
}

function StyleLine({ label, value, color }: { label: string; value?: string; color?: string }) {
  const hex = color ? rgbToHex(color) : null;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {hex && <div style={{ width: 14, height: 14, borderRadius: 4, background: hex, border: "1px solid rgba(255,255,255,0.15)" }} />}
        <span style={{ fontSize: 12, color: "var(--text)", fontFamily: "monospace" }}>
          {hex ?? value}
        </span>
      </div>
    </div>
  );
}

function Spinner() {
  return <span style={{ width: 14, height: 14, border: "2px solid rgba(0,0,0,0.2)", borderTopColor: "#0C0C0E", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />;
}

// ── Box Capture Card ───────────────────────────────────────────────────────────

function BoxCaptureView({ nodes, captureLabel, initialStep, onStepChange, onSelect, onClear, nodeChanges }: {
  nodes: DOMNode[];
  captureLabel: string;
  initialStep: number;
  onStepChange: (step: number) => void;
  onSelect: (id: number) => void;
  onClear: () => void;
  nodeChanges: Record<number, NodeChange>;
}) {
  const [step, setStepRaw] = useState(initialStep);
  const setStep = (fn: number | ((s: number) => number)) => {
    setStepRaw(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      onStepChange(next);
      return next;
    });
  };
  const steps = useMemo(() => buildSteps(nodes), [nodes]);

  const node = steps[step] ?? null;

  if (steps.length === 0) {
    return (
      <div style={{ padding: "32px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
          No editable elements found in that area.
        </div>
        <button onClick={onClear} style={clearBtnSt}>✕ Clear Selection</button>
      </div>
    );
  }

  const bgHex   = node ? rgbToHex(node.styles.backgroundColor) : null;
  const textHex = node ? rgbToHex(node.styles.color) : null;
  const fs      = node ? parsePx(node.styles.fontSize, 0) : 0;
  const fw      = node?.styles.fontWeight ?? "";
  const radius  = node ? parsePx(node.styles.borderRadius, 0) : 0;
  const hasChange = node ? !!nodeChanges[node.id] : false;

  const fwLabel = fw === "700" || fw === "bold" ? " · Bold"
    : fw === "300" ? " · Light"
    : fw === "500" ? " · Medium"
    : "";

  return (
    <div style={{ padding: "14px 14px 24px" }}>
      {/* ── Single card ─────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: 16,
        border: `1.5px solid ${hasChange ? "var(--accent)" : "var(--border)"}`,
        background: "var(--surface2)",
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
        transition: "border-color 200ms",
      }}>

        {/* Header: type + step counter */}
        <div style={{
          padding: "10px 14px",
          background: "var(--surface3)",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", flex: 1 }}>
            {node ? friendlyType(node) : "—"}
          </span>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{step + 1} / {steps.length}</span>
          {hasChange && (
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
          )}
        </div>

        {/* Text preview */}
        {node?.text && (
          <div style={{
            padding: "12px 14px",
            fontSize: 14, fontWeight: 600, color: "var(--text)", lineHeight: 1.4,
            borderBottom: "1px solid var(--border)",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
            {node.text}
          </div>
        )}

        {/* Style rows */}
        <div style={{ padding: "0 14px" }}>
          {bgHex   && <StyleLine label="Background"     color={node!.styles.backgroundColor} />}
          {textHex && <StyleLine label="Text Color"     color={node!.styles.color} />}
          {fs > 0  && <StyleLine label="Font Size"      value={`${fs}px${fwLabel}`} />}
          {radius > 0 && <StyleLine label="Rounded Corners" value={`${radius}px`} />}
          {node && <StyleLine label="Size" value={`${node.rect.width} × ${node.rect.height}px`} />}
        </div>

        {/* Edit button */}
        {node && (
          <div style={{ padding: "12px 14px" }}>
            <button
              onClick={() => onSelect(node.id)}
              style={{
                width: "100%", padding: "11px",
                background: "var(--accent)", border: "none",
                borderRadius: 10, cursor: "pointer",
                fontSize: 13, fontWeight: 700, color: "#0C0C0E",
                transition: "opacity 150ms",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >
              ✏  Edit This Element
            </button>
          </div>
        )}

        {/* Navigation */}
        <div style={{
          borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", padding: "10px 14px", gap: 8,
        }}>
          {/* Prev */}
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            style={{
              ...navBtnSt,
              opacity: step === 0 ? 0.3 : 1,
              cursor: step === 0 ? "default" : "pointer",
            }}
          >
            ↑
          </button>

          {/* Dot indicators */}
          <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: 5 }}>
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                style={{
                  width: i === step ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === step ? "var(--accent)" : "var(--border)",
                  border: "none", padding: 0, cursor: "pointer",
                  transition: "width 200ms, background 200ms",
                }}
              />
            ))}
          </div>

          {/* Next */}
          <button
            onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}
            disabled={step === steps.length - 1}
            style={{
              ...navBtnSt,
              background: step < steps.length - 1 ? "rgba(123,97,255,0.15)" : "transparent",
              color: step < steps.length - 1 ? "var(--accent2)" : "var(--muted)",
              border: step < steps.length - 1 ? "1px solid rgba(123,97,255,0.3)" : "1px solid var(--border)",
              opacity: step === steps.length - 1 ? 0.3 : 1,
              cursor: step === steps.length - 1 ? "default" : "pointer",
            }}
          >
            ↓
          </button>
        </div>
      </div>

      {/* Clear button */}
      <button onClick={onClear} style={{ ...clearBtnSt, marginTop: 10 }}>
        ✕ Clear Selection
      </button>
    </div>
  );
}

const navBtnSt: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10,
  background: "var(--surface3)", border: "1px solid var(--border)",
  color: "var(--text)", fontSize: 14, fontWeight: 700,
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0, transition: "all 150ms",
};

const clearBtnSt: React.CSSProperties = {
  width: "100%", padding: "9px",
  background: "transparent", border: "1px solid var(--border)",
  borderRadius: 10, color: "var(--muted)",
  fontSize: 12, cursor: "pointer",
  transition: "border-color 150ms, color 150ms",
};

// ── Element Card (full scan view) ──────────────────────────────────────────────

function friendlyTag(tag: string) {
  const map: Record<string, string> = {
    h1: "Heading 1", h2: "Heading 2", h3: "Heading 3",
    h4: "Heading 4", h5: "Heading 5", h6: "Heading 6",
    button: "Button", a: "Link", p: "Paragraph",
    img: "Image", span: "Text", label: "Label", li: "List item",
  };
  return map[tag] ?? tag.toUpperCase();
}

function ElementCard({ node, onSelect, hasChange }: { node: DOMNode; onSelect: (id: number) => void; hasChange: boolean }) {
  const textHex = rgbToHex(node.styles.color);
  const bgHex   = rgbToHex(node.styles.backgroundColor);
  const fs      = parsePx(node.styles.fontSize, 14);

  return (
    <button
      onClick={() => onSelect(node.id)}
      style={{
        width: "100%", textAlign: "left",
        padding: "10px 14px", margin: 0,
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        borderRadius: 10, cursor: "pointer",
        display: "flex", flexDirection: "column", gap: 6,
        transition: "border-color 150ms, background 150ms",
        position: "relative",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--accent2)";
        (e.currentTarget as HTMLElement).style.background = "var(--surface3)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.background = "var(--surface2)";
      }}
    >
      {hasChange && (
        <div style={{ position: "absolute", top: 10, right: 10, width: 7, height: 7, borderRadius: "50%", background: "var(--accent)" }} />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "var(--surface3)", color: "var(--accent2)", letterSpacing: "0.05em" }}>
          {friendlyTag(node.tag)}
        </span>
        <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: "auto" }}>
          {node.rect.width}×{node.rect.height}
        </span>
      </div>
      {node.text && (
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.4 }}>
          {node.text}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {textHex && <Swatch color={node.styles.color} label="Text" />}
        {bgHex   && <Swatch color={node.styles.backgroundColor} label="BG" />}
        <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: "auto", fontFamily: "monospace" }}>
          {fs}px {node.styles.fontWeight === "700" || node.styles.fontWeight === "bold" ? "· Bold" : ""}
        </span>
      </div>
    </button>
  );
}

function ImageCard({ node, onSelect }: { node: DOMNode; onSelect: (id: number) => void }) {
  const bgHex = rgbToHex(node.styles.backgroundColor);
  return (
    <button
      onClick={() => onSelect(node.id)}
      style={{
        width: "100%", textAlign: "left", padding: "10px 14px",
        background: "var(--surface2)", border: "1px solid var(--border)",
        borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
        transition: "border-color 150ms, background 150ms",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--accent2)";
        (e.currentTarget as HTMLElement).style.background = "var(--surface3)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.background = "var(--surface2)";
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0, background: bgHex || "var(--surface3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🖼</div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--accent2)" }}>Image</div>
        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{node.rect.width}×{node.rect.height}px</div>
      </div>
    </button>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────

function EmptyState({ onScan, isScanning, error }: { onScan: () => void; isScanning: boolean; error: string | null }) {
  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 14 }}>🎨</div>
        <div style={{ fontSize: 19, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Edit any webpage</div>
        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65, maxWidth: 300 }}>
          Scan the page to see all its headings, buttons, images and text — then click anything to change it.
        </div>
      </div>
      {error && (
        <div style={{ width: "100%", padding: "10px 14px", background: "rgba(255,92,87,0.1)", border: "1px solid rgba(255,92,87,0.3)", borderRadius: 10, fontSize: 12, color: "#FF5C57", lineHeight: 1.5 }}>
          {error}
        </div>
      )}
      <button
        onClick={onScan} disabled={isScanning}
        style={{ width: "100%", padding: "14px", background: isScanning ? "var(--surface3)" : "var(--accent)", border: "none", borderRadius: 12, cursor: isScanning ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 700, color: isScanning ? "var(--muted)" : "#0C0C0E", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: isScanning ? 0.7 : 1 }}
      >
        {isScanning ? <><Spinner /> Scanning…</> : "Scan Page"}
      </button>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          ["✏️", "Edit text on any element"],
          ["🎨", "Change colors instantly"],
          ["↕️", "Adjust font size & weight"],
          ["⬡", "Control rounded corners"],
        ].map(([icon, text]) => (
          <div key={text as string} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--surface2)", borderRadius: 10 }}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Element Editor ─────────────────────────────────────────────────────────────

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hex = rgbToHex(value);
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>{label}</div>
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: hex || "repeating-conic-gradient(#444 0% 25%, #222 0% 50%) 0 0 / 10px 10px", border: "2px solid var(--border)", overflow: "hidden", position: "relative" }}>
          <input type="color" value={hex || "#ffffff"} onChange={e => onChange(e.target.value)}
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "monospace" }}>{hex || "None"}</div>
          <div style={{ fontSize: 10, color: "var(--muted)" }}>click swatch to pick</div>
        </div>
      </label>
    </div>
  );
}

function Slider({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", fontFamily: "monospace" }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }} />
    </div>
  );
}

function WeightPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const weights = [{ l: "Light", v: "300" }, { l: "Regular", v: "400" }, { l: "Medium", v: "500" }, { l: "Bold", v: "700" }];
  const cur = value === "bold" ? "700" : ["300","400","500","700"].includes(value) ? value : "400";
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Font Weight</div>
      <div style={{ display: "flex", gap: 4 }}>
        {weights.map(w => (
          <button key={w.v} onClick={() => onChange(w.v)} style={{ flex: 1, padding: "7px 0", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: Number(w.v) as any, background: cur === w.v ? "var(--accent)" : "var(--surface3)", color: cur === w.v ? "#0C0C0E" : "var(--muted)", transition: "all 150ms" }}>
            {w.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function ElementEditor({ node, changes, onBack, onChange }: { node: DOMNode; changes: NodeChange; onBack: () => void; onChange: (c: NodeChange) => void }) {
  const textVal = typeof changes.text === "string" ? changes.text : (node.text ?? "");
  const colorVal = changes.color ?? node.styles.color;
  const bgVal    = changes.backgroundColor ?? node.styles.backgroundColor;
  const fs       = parsePx(changes.fontSize ?? node.styles.fontSize, 16);
  const radius   = parsePx(changes.borderRadius ?? node.styles.borderRadius, 0);
  const weight   = changes.fontWeight ?? node.styles.fontWeight;

  return (
    <div>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface2)", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 13, display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
          ← Back
        </button>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{friendlyType(node)}</span>
        <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "monospace" }}>{node.rect.width}×{node.rect.height}</span>
      </div>
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 18 }}>
        {node.text !== null && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Text Content</div>
            <textarea
              value={textVal}
              onChange={e => {
                const { selectionStart, selectionEnd } = e.target;
                const el = e.target;
                onChange({ text: e.target.value });
                requestAnimationFrame(() => {
                  el.selectionStart = selectionStart;
                  el.selectionEnd = selectionEnd;
                });
              }}
              rows={Math.max(2, Math.min(4, Math.ceil(textVal.length / 42)))}
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", background: "var(--surface3)", border: "1.5px solid var(--border)", borderRadius: 10, color: "var(--text)", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", lineHeight: 1.5, transition: "border-color 150ms" }}
              onFocus={e => { e.currentTarget.style.borderColor = "var(--accent)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
            />
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <ColorPicker label="Text Color" value={colorVal} onChange={v => onChange({ color: v })} />
          <ColorPicker label="Background" value={bgVal} onChange={v => onChange({ backgroundColor: v })} />
        </div>
        <Slider label="Font Size" value={fs} min={8} max={72} unit="px" onChange={v => onChange({ fontSize: `${v}px` })} />
        <WeightPicker value={weight} onChange={v => onChange({ fontWeight: v })} />
        <Slider label="Rounded Corners" value={radius} min={0} max={40} unit="px" onChange={v => onChange({ borderRadius: `${v}px` })} />
      </div>
    </div>
  );
}

// ── Main Inspector ─────────────────────────────────────────────────────────────

export default function Inspector() {
  const {
    domTree, isScanning, captureError, scanDOM,
    selectedNodeId, selectNode, nodeChanges, applyNodeChange,
    boxCaptures, startBoxSelect, clearBoxCapture, reorderBoxCaptures,
  } = usePixelMorph();

  // Persist the active step for each capture across editor round-trips
  const [captureSteps, setCaptureSteps] = useState<Record<number, number>>({});

  // ── Animated drag-and-drop ─────────────────────────────────────────────────
  // Cards physically follow the cursor via translateY. Sibling cards shift to
  // show where the dragged card will land. Positions are snapshotted at drag-
  // start so hit-testing is never confused by in-flight transforms.
  interface DragInfo {
    from: number;
    insertAt: number;
    startY: number;
    currentY: number;
    cardHeight: number;
  }
  const [dragState, setDragState]   = useState<DragInfo | null>(null);
  const [settling,  setSettling]    = useState(false);
  const dragInfoRef  = useRef<DragInfo | null>(null);
  const cardRefs     = useRef<(HTMLDivElement | null)[]>([]);
  const snapPos      = useRef<{ top: number; height: number }[]>([]);

  // Determine insert-before index using pre-drag snapshot positions.
  // Swap triggers when the cursor crosses the midpoint of a sibling card.
  const calcInsertAt = (clientY: number, from: number, total: number): number => {
    for (let j = 0; j < total; j++) {
      if (j === from) continue;
      const p = snapPos.current[j];
      if (!p) continue;
      if (clientY < p.top + p.height * 0.5) return j;
    }
    return total;
  };

  // How much each card should be translated during an active drag.
  const getTranslateY = (j: number, ds: DragInfo): number => {
    if (j === ds.from) return ds.currentY - ds.startY;
    const to = ds.insertAt > ds.from ? ds.insertAt - 1 : ds.insertAt;
    if (to > ds.from && j > ds.from && j <= to) return -ds.cardHeight;
    if (to < ds.from && j >= to  && j <  ds.from) return  ds.cardHeight;
    return 0;
  };

  const onHandlePointerDown = (e: React.PointerEvent, i: number) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const total = boxCaptures.length;

    // Snapshot natural card positions before any transforms are applied.
    snapPos.current = cardRefs.current.slice(0, total).map(el => {
      if (!el) return { top: 0, height: 0 };
      const r = el.getBoundingClientRect();
      return { top: r.top, height: r.height };
    });

    const cardHeight = snapPos.current[i]?.height ?? 200;
    const initial: DragInfo = {
      from: i, insertAt: i,
      startY: e.clientY, currentY: e.clientY, cardHeight,
    };
    dragInfoRef.current = initial;
    setDragState(initial);

    const onMove = (ev: PointerEvent) => {
      const info = dragInfoRef.current;
      if (!info) return;
      const insertAt = calcInsertAt(ev.clientY, i, total);
      const next: DragInfo = { ...info, insertAt, currentY: ev.clientY };
      dragInfoRef.current = next;
      setDragState(next);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup",   onUp);

      const info = dragInfoRef.current;
      dragInfoRef.current = null;

      // Suppress CSS transitions for one paint so cards snap to new positions
      // instead of animating from their dragged coordinates.
      setSettling(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setSettling(false)));
      setDragState(null);

      if (!info) return;
      const { from, insertAt: raw } = info;
      const to = raw > from ? raw - 1 : raw;
      if (from === to) return;

      reorderBoxCaptures(from, to);
      setCaptureSteps(prev => {
        const arr = Array.from({ length: total }, (_, idx) => prev[idx] ?? 0);
        const [moved] = arr.splice(from, 1);
        arr.splice(to, 0, moved);
        return Object.fromEntries(arr.map((s, idx) => [idx, s]));
      });
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup",   onUp);
  };

  const groups = useMemo(() => domTree ? buildGroups(domTree) : [], [domTree]);

  const allBoxNodes = useMemo(() => boxCaptures.flat(), [boxCaptures]);
  const selectedNode = allBoxNodes.length > 0
    ? (allBoxNodes.find(n => n.id === selectedNodeId) ?? null)
    : findNode(domTree, selectedNodeId ?? -1);
  const pendingChanges = selectedNodeId !== null ? (nodeChanges[selectedNodeId] ?? {}) : {};

  const handleSelect = useCallback((id: number) => selectNode(id), [selectNode]);
  const handleBack   = useCallback(() => selectNode(null), [selectNode]);
  const handleChange = useCallback((changes: NodeChange) => {
    if (selectedNodeId === null) return;
    applyNodeChange(selectedNodeId, changes);
  }, [selectedNodeId, applyNodeChange]);

  // Which capture (if any) owns the currently-selected node.
  // -1 means the selection came from the full DOM scan, not a box capture.
  const editingCaptureIdx = selectedNodeId !== null
    ? boxCaptures.findIndex(nodes => nodes.some(n => n.id === selectedNodeId))
    : -1;

  const showEmpty  = !domTree && boxCaptures.length === 0 && !isScanning;
  // Full-screen editor only for DOM-scan selections (not inside a capture).
  const showEditor = !!selectedNode && editingCaptureIdx === -1;
  const showList   = !!domTree || boxCaptures.length > 0;

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {showEmpty && <EmptyState onScan={scanDOM} isScanning={isScanning} error={captureError} />}

      {isScanning && (
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><Spinner /></div>
          <div style={{ fontSize: 14, color: "var(--muted)" }}>Reading the page…</div>
        </div>
      )}

      {showEditor && selectedNode && (
        <ElementEditor node={selectedNode} changes={pendingChanges} onBack={handleBack} onChange={handleChange} />
      )}

      {showList && !showEditor && (
        <>
          {/* Header bar — always visible */}
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--surface2)", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--muted)", flex: 1 }}>Tap anything to edit it</span>
            <button
              onClick={startBoxSelect}
              style={{ padding: "5px 10px", background: "rgba(123,97,255,0.15)", border: "1px solid rgba(123,97,255,0.35)", borderRadius: 6, color: "var(--accent2)", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
            >
              ⬡ Capture Box
            </button>
            <button onClick={scanDOM} style={{ padding: "5px 10px", background: "var(--surface3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--muted)", fontSize: 11, cursor: "pointer" }}>
              ↻
            </button>
          </div>

          {/* One drill-down card per box capture — drag handle to reprioritise */}
          {boxCaptures.map((nodes, i) => {
            const isDragging = dragState?.from === i;
            const translateY = dragState ? getTranslateY(i, dragState) : 0;
            return (
              <div
                key={i}
                ref={el => { cardRefs.current[i] = el; }}
                style={{
                  position: "relative",
                  zIndex: isDragging ? 100 : 1,
                  transform: `translateY(${translateY}px)`,
                  transition: isDragging || settling ? "none" : "transform 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                  boxShadow: isDragging ? "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1.5px rgba(123,97,255,0.4)" : "none",
                  borderRadius: isDragging ? 12 : 0,
                }}
              >
                {boxCaptures.length > 1 && (
                  <div
                    onPointerDown={e => onHandlePointerDown(e, i)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 16px 2px",
                      cursor: isDragging ? "grabbing" : "grab",
                      userSelect: "none", touchAction: "none",
                    }}
                  >
                    <span style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1 }}>⠿</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: i === 0 ? "var(--accent2)" : "var(--muted)",
                    }}>
                      Priority {i + 1}{i === 0 ? " · overrides below" : ""}
                    </span>
                  </div>
                )}

                {editingCaptureIdx === i && selectedNode
                  ? <ElementEditor
                      node={selectedNode}
                      changes={pendingChanges}
                      onBack={handleBack}
                      onChange={handleChange}
                    />
                  : <BoxCaptureView
                      nodes={nodes}
                      captureLabel=""
                      initialStep={captureSteps[i] ?? 0}
                      onStepChange={s => setCaptureSteps(prev => ({ ...prev, [i]: s }))}
                      onSelect={handleSelect}
                      onClear={() => clearBoxCapture(i)}
                      nodeChanges={nodeChanges}
                    />
                }
              </div>
            );
          })}

          {/* Full DOM scan: grouped element cards (shown below captures) */}
          {domTree && (
            <div style={{ padding: boxCaptures.length > 0 ? "0 14px 24px" : "14px 14px 24px" }}>
              {boxCaptures.length > 0 && (
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", padding: "12px 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Full Page Scan
                </div>
              )}
              {groups.map(group => (
                <div key={group.label} style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{group.icon} {group.label}</span>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>({group.nodes.length})</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {group.nodes.slice(0, 12).map(node =>
                      node.tag === "img"
                        ? <ImageCard key={node.id} node={node} onSelect={handleSelect} />
                        : <ElementCard key={node.id} node={node} onSelect={handleSelect} hasChange={!!nodeChanges[node.id]} />
                    )}
                  </div>
                </div>
              ))}
              {groups.length === 0 && boxCaptures.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)", fontSize: 13 }}>
                  No editable elements found on this page.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
