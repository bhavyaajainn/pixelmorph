"use client";

import { usePixelMorph } from "@/context/PixelMorphContext";
import type { AssetItem } from "@/types";

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
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase" as const,
      color: "var(--text-muted)",
      marginBottom: 10,
    }}>{children}</div>
  );
}

export default function AssetsTab() {
  const { assets } = usePixelMorph();
  const imgAssets = assets.filter(a => a.type === "img");
  const bgAssets = assets.filter(a => a.type === "bg");

  return (
    <div>
      <Section>
        <SectionTitle>Detected Images &amp; Logos</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {imgAssets.map(asset => (
            <AssetRow key={asset.id} asset={asset} action="Swap" />
          ))}
        </div>
        <button style={{
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
        }}>Upload replacement asset</button>
      </Section>

      <Section noBorder>
        <SectionTitle>CSS Background Images</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {bgAssets.map(asset => (
            <AssetRow key={asset.id} asset={asset} action="Edit" />
          ))}
        </div>
      </Section>
    </div>
  );
}

function AssetRow({ asset, action }: { asset: AssetItem; action: "Swap" | "Edit" }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 10px",
      background: "var(--surface3)",
      borderRadius: "var(--radius)",
      border: "1px solid transparent",
      transition: "border-color 150ms",
    }}>
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 4,
        background: asset.gradient ?? "var(--surface2)",
        flexShrink: 0,
        border: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}>
        {!asset.gradient && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="var(--text-muted)" strokeWidth="1.5" />
            <circle cx="8.5" cy="8.5" r="1.5" fill="var(--text-muted)" />
            <path d="M3 15l5-4 4 4 3-3 6 6" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap" as const,
        }}>{asset.name}</div>
        <div style={{
          fontFamily: "var(--font-dm-mono), monospace",
          fontSize: 10,
          color: "var(--text-muted)",
          marginTop: 2,
        }}>
          {asset.type} · {asset.context}{asset.dimensions ? ` · ${asset.dimensions}` : ""}
        </div>
      </div>

      <button style={{
        padding: "5px 12px",
        background: "rgba(123,97,255,0.12)",
        border: "1px solid rgba(123,97,255,0.25)",
        borderRadius: 6,
        color: "var(--accent2)",
        fontSize: 11,
        fontFamily: "var(--font-syne), sans-serif",
        fontWeight: 700,
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 150ms",
      }}>{action}</button>
    </div>
  );
}
