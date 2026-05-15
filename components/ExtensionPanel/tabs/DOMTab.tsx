"use client";

import { useState, useCallback } from "react";
import { usePixelMorph } from "@/context/PixelMorphContext";
import type { DOMNode, NodeChange } from "@/types";
import { CaptureButton } from "./ColorsTab";

// ── Helpers ───────────────────────────────────────────────────────────────────

function findNode(tree: DOMNode | null, id: number): DOMNode | null {
  if (!tree) return null;
  if (tree.id === id) return tree;
  for (const child of tree.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

function isTransparent(v: string) {
  return !v || v === "rgba(0, 0, 0, 0)" || v === "transparent";
}

// ── Tree Node ─────────────────────────────────────────────────────────────────

function TreeRow({
  node, depth, selectedId, onSelect,
}: {
  node: DOMNode;
  depth: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const isSelected = node.id === selectedId;

  const label = node.elId
    ? `#${node.elId}`
    : node.classes[0]
    ? `.${node.classes[0]}`
    : "";

  return (
    <div>
      <div
        onClick={() => onSelect(node.id)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          paddingLeft: depth * 14 + 8,
          paddingRight: 8,
          paddingTop: 3,
          paddingBottom: 3,
          cursor: "pointer",
          background: isSelected ? "rgba(123,97,255,0.18)" : "transparent",
          borderLeft: isSelected ? "2px solid var(--accent2)" : "2px solid transparent",
          transition: "background 100ms",
          userSelect: "none",
        }}
        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        {/* Expand/collapse toggle */}
        <span
          onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
          style={{
            width: 12, fontSize: 8, color: "var(--text-muted)",
            flexShrink: 0, opacity: hasChildren ? 1 : 0,
            cursor: hasChildren ? "pointer" : "default",
          }}
        >
          {open ? "▼" : "▶"}
        </span>

        {/* Tag */}
        <span style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 11, color: "var(--accent2)", flexShrink: 0 }}>
          {node.tag}
        </span>

        {/* ID or class */}
        {label && (
          <span style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>
            {label}
          </span>
        )}

        {/* Dimensions */}
        <span style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 9, color: "var(--surface3)", background: "var(--surface3)", padding: "0 4px", borderRadius: 3, flexShrink: 0 }}>
          {node.rect.width}×{node.rect.height}
        </span>

        {/* Text preview */}
        {node.text && (
          <span style={{ fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, fontStyle: "italic" }}>
            {node.text.slice(0, 28)}
          </span>
        )}

        {/* Color swatches */}
        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          {!isTransparent(node.styles.backgroundColor) && (
            <div style={{ width: 8, height: 8, borderRadius: 2, background: node.styles.backgroundColor, border: "1px solid rgba(255,255,255,0.15)" }} />
          )}
          <div style={{ width: 8, height: 8, borderRadius: 2, background: node.styles.color, border: "1px solid rgba(255,255,255,0.15)" }} />
        </div>
      </div>

      {open && hasChildren && node.children.map(child => (
        <TreeRow key={child.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
}

// ── Node Editor ───────────────────────────────────────────────────────────────

function NodeEditor({ node, changes, onChange }: { node: DOMNode; changes: NodeChange; onChange: (c: NodeChange) => void }) {
  const merged = { ...node.styles, text: node.text ?? "", ...changes };

  return (
    <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)", background: "var(--surface2)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 11, color: "var(--accent2)", fontWeight: 700 }}>
          {"<"}{node.tag}
          {node.elId ? `#${node.elId}` : node.classes[0] ? `.${node.classes[0]}` : ""}
          {">"}
        </span>
        <span style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 9, color: "var(--text-muted)" }}>
          {node.rect.width}×{node.rect.height}px
        </span>
      </div>

      {/* Text */}
      {node.text !== null && (
        <EditorRow label="Text">
          <input
            value={typeof changes.text === "string" ? changes.text : node.text ?? ""}
            placeholder="Text content…"
            onChange={e => onChange({ text: e.target.value })}
            style={inputSt}
          />
        </EditorRow>
      )}

      {/* Colors */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
        <ColorField label="Color" value={changes.color ?? merged.color} onChange={v => onChange({ color: v })} />
        <ColorField label="Background" value={changes.backgroundColor ?? merged.backgroundColor} onChange={v => onChange({ backgroundColor: v })} />
      </div>

      {/* Typography */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
        <TextProp label="Font size" value={changes.fontSize ?? merged.fontSize} onChange={v => onChange({ fontSize: v })} />
        <TextProp label="Weight" value={changes.fontWeight ?? merged.fontWeight} onChange={v => onChange({ fontWeight: v })} />
      </div>

      {/* Radius */}
      <EditorRow label="Border radius">
        <input
          value={changes.borderRadius ?? merged.borderRadius}
          onChange={e => onChange({ borderRadius: e.target.value })}
          style={inputSt}
        />
      </EditorRow>
    </div>
  );
}

function EditorRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 3 }}>{label}</div>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 3 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 7px", background: "var(--surface3)", borderRadius: "var(--radius)", border: "1px solid var(--border-hover)" }}>
        <input
          type="color"
          value={toHex(value)}
          onChange={e => onChange(e.target.value)}
          style={{ width: 18, height: 18, border: "none", padding: 0, background: "none", cursor: "pointer", borderRadius: 3 }}
        />
        <span style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 10, color: "var(--text-muted)" }}>
          {toHex(value)}
        </span>
      </div>
    </div>
  );
}

function TextProp({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 3 }}>{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)} style={inputSt} />
    </div>
  );
}

function toHex(color: string): string {
  if (!color || color === "rgba(0, 0, 0, 0)") return "#000000";
  if (color.startsWith("#")) return color;
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return "#000000";
  return "#" + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, "0")).join("");
}

const inputSt: React.CSSProperties = {
  width: "100%", padding: "4px 7px",
  background: "var(--surface3)", border: "1px solid var(--border-hover)",
  borderRadius: "var(--radius)", color: "var(--text)",
  fontSize: 11, fontFamily: "var(--font-dm-mono), monospace", outline: "none",
};

// ── DOM Tab ───────────────────────────────────────────────────────────────────

export default function DOMTab() {
  const {
    domTree, isScanning, captureError, scanDOM,
    selectedNodeId, selectNode, nodeChanges, applyNodeChange,
  } = usePixelMorph();

  const selectedNode = findNode(domTree, selectedNodeId ?? -1);
  const pendingChanges = selectedNodeId !== null ? (nodeChanges[selectedNodeId] ?? {}) : {};

  const handleChange = useCallback((changes: NodeChange) => {
    if (selectedNodeId === null) return;
    applyNodeChange(selectedNodeId, changes);
  }, [selectedNodeId, applyNodeChange]);

  return (
    <div>
      {/* Scan button */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
        <CaptureButton
          label={domTree ? "↻ Rescan Page DOM" : "Scan Full Page DOM"}
          loading={isScanning}
          onClick={scanDOM}
        />
        {captureError && (
          <div style={{ marginTop: 8, padding: "7px 10px", background: "rgba(255,92,87,0.1)", border: "1px solid rgba(255,92,87,0.3)", borderRadius: "var(--radius)", fontSize: 11, color: "#FF5C57" }}>
            {captureError}
          </div>
        )}
        {!domTree && !isScanning && !captureError && (
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.5 }}>
            Scans the page and builds a complete DOM tree. Click any element to inspect and edit it directly.
          </p>
        )}
      </div>

      {/* Stats bar */}
      {domTree && (
        <div style={{ padding: "6px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 10, color: "var(--text-muted)" }}>
            {domTree.rect.width}×{domTree.rect.height}
          </span>
          <span style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 10, color: "var(--accent2)" }}>
            {Object.keys(nodeChanges).length} edits
          </span>
          {selectedNodeId !== null && (
            <button
              onClick={() => selectNode(null)}
              style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "var(--text-muted)" }}
            >
              ✕ deselect
            </button>
          )}
        </div>
      )}

      {/* Tree */}
      {domTree && (
        <div style={{ fontSize: 12 }}>
          <TreeRow node={domTree} depth={0} selectedId={selectedNodeId} onSelect={selectNode} />
        </div>
      )}

      {/* Node editor — appears below tree when a node is selected */}
      {selectedNode && (
        <NodeEditor node={selectedNode} changes={pendingChanges} onChange={handleChange} />
      )}
    </div>
  );
}
