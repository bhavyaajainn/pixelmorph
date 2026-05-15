"use client";

import { usePixelMorph } from "@/context/PixelMorphContext";
import type { Preset, TextOverride, AssetItem } from "@/types";

export default function BrowserMockup() {
  const { currentSite, changesCount, activePresetId, presets, textOverrides, assets } = usePixelMorph();
  const activePreset = presets.find(p => p.id === activePresetId) ?? null;

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      padding: "24px",
      gap: 16,
      overflow: "hidden",
      minWidth: 0,
    }}>
      <div style={{
        flex: 1,
        background: "var(--surface)",
        borderRadius: 12,
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minHeight: 0,
      }}>
        <ChromeBar currentSite={currentSite} />
        <MockPage />
      </div>

      <StatusPills
        changesCount={changesCount}
        activePreset={activePreset}
        textOverrides={textOverrides}
        assets={assets}
      />
    </div>
  );
}

function ChromeBar({ currentSite }: { currentSite: string }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 14px",
      background: "var(--surface2)",
      borderBottom: "1px solid var(--border)",
      flexShrink: 0,
    }}>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {(["#FF5F57", "#FEBC2E", "#28C840"] as const).map((color, i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: color }} />
        ))}
      </div>

      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        background: "var(--surface3)",
        borderRadius: 6,
        border: "1px solid var(--border)",
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--text-muted)" strokeWidth="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="var(--text-muted)" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        <span style={{
          fontFamily: "var(--font-dm-mono), monospace",
          fontSize: 11,
          color: "var(--text-muted)",
        }}>{currentSite}</span>
      </div>

      <div style={{
        width: 22,
        height: 22,
        borderRadius: 4,
        background: "#0f1f0f",
        border: "1px solid var(--accent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 800,
        color: "var(--accent)",
        fontFamily: "var(--font-syne), sans-serif",
        flexShrink: 0,
        cursor: "pointer",
      }}>P</div>
    </div>
  );
}

function AnnotationLabel({ color, text, top = -20 }: { color: string; text: string; top?: number }) {
  return (
    <div style={{
      position: "absolute",
      top,
      left: 0,
      padding: "2px 6px",
      background: color,
      borderRadius: 3,
      fontSize: 9,
      fontFamily: "var(--font-dm-mono), monospace",
      fontWeight: 500,
      color: "#fff",
      whiteSpace: "nowrap" as const,
      pointerEvents: "none",
      zIndex: 10,
      lineHeight: 1.5,
    }}>{text}</div>
  );
}

function MockPage() {
  return (
    <div style={{
      flex: 1,
      overflowY: "auto",
      background: "#fff",
      position: "relative",
    }}>
      {/* Navbar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        padding: "14px 24px",
        borderBottom: "1px solid #E8E8E8",
        gap: 20,
        background: "#fff",
        position: "sticky",
        top: 0,
        zIndex: 5,
      }}>
        <div style={{ position: "relative", paddingTop: 18 }}>
          <AnnotationLabel color="#7B61FF" text="text override" top={0} />
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 17,
            fontWeight: 700,
            color: "#635BFF",
            marginTop: 4,
          }}>NovaPay</div>
        </div>

        <div style={{ display: "flex", gap: 16, flex: 1 }}>
          {["Products", "Solutions", "Developers", "Pricing"].map(link => (
            <span key={link} style={{ fontSize: 12, color: "#666", fontFamily: "sans-serif" }}>{link}</span>
          ))}
        </div>

        <div style={{ position: "relative", paddingTop: 18 }}>
          <AnnotationLabel color="#7B61FF" text="text override" top={0} />
          <div style={{
            padding: "6px 14px",
            background: "#635BFF",
            borderRadius: 4,
            fontSize: 12,
            fontFamily: "sans-serif",
            color: "#fff",
            fontWeight: 600,
            marginTop: 4,
          }}>Get Started Free</div>
        </div>
      </div>

      {/* Hero */}
      <div style={{
        padding: "48px 24px 40px",
        background: "linear-gradient(135deg, #667eea18, #764ba218)",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ maxWidth: 380, position: "relative" }}>
          <div style={{ position: "relative", paddingTop: 20, marginBottom: 14 }}>
            <AnnotationLabel color="#7B61FF" text="text override" top={0} />
            <h1 style={{
              fontSize: 26,
              fontWeight: 800,
              color: "#0A2540",
              lineHeight: 1.25,
              fontFamily: "sans-serif",
              margin: 0,
              marginTop: 4,
            }}>The future of online payments</h1>
          </div>
          <p style={{
            fontSize: 13,
            color: "#425466",
            fontFamily: "sans-serif",
            margin: 0,
            lineHeight: 1.6,
          }}>
            Unified APIs and tools that instantly enable payments, manage subscriptions, and more.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <div style={{
              padding: "8px 18px",
              background: "#635BFF",
              borderRadius: 4,
              fontSize: 12,
              color: "#fff",
              fontFamily: "sans-serif",
              fontWeight: 600,
            }}>Start for free</div>
            <div style={{
              padding: "8px 18px",
              border: "1px solid #ccc",
              borderRadius: 4,
              fontSize: 12,
              color: "#425466",
              fontFamily: "sans-serif",
            }}>Contact sales</div>
          </div>
        </div>

        {/* Hero image — annotated as swapped */}
        <div style={{ position: "absolute", right: 24, top: 24, paddingTop: 20 }}>
          <AnnotationLabel color="#FF5C57" text="image swap" top={0} />
          <div style={{
            width: 160,
            height: 110,
            borderRadius: 8,
            background: "linear-gradient(135deg, #635BFF, #00D4FF)",
            border: "2px dashed rgba(255,92,87,0.6)",
            marginTop: 4,
          }} />
        </div>
      </div>

      {/* Features */}
      <div style={{ padding: "24px" }}>
        <div style={{ position: "relative", paddingTop: 20, marginBottom: 14 }}>
          <AnnotationLabel color="#28C840" text="color mapped" top={0} />
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#00D4FF",
            fontFamily: "sans-serif",
            marginTop: 4,
          }}>Unified platform</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {["Payments", "Billing", "Connect"].map(name => (
            <div key={name} style={{
              flex: 1,
              padding: "14px",
              background: "#F6F8FA",
              borderRadius: 8,
              fontSize: 11,
              color: "#425466",
              fontFamily: "sans-serif",
            }}>
              <div style={{ fontWeight: 700, color: "#0A2540", marginBottom: 6, fontSize: 12 }}>{name}</div>
              Accept payments globally with a single integration across all major methods.
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusPills({
  changesCount,
  activePreset,
  textOverrides,
  assets,
}: {
  changesCount: number;
  activePreset: Preset | null;
  textOverrides: TextOverride[];
  assets: AssetItem[];
}) {
  const swappedAssets = assets.filter(a => a.type === "img").length;

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, flexShrink: 0 }}>
      <Pill borderColor="var(--border-hover)" color="var(--text-muted)">
        <span style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--accent)",
          animation: "pulse-dot 2s infinite",
          marginRight: 6,
          verticalAlign: "middle",
        }} />
        {changesCount} active changes
      </Pill>

      {activePreset && (
        <Pill borderColor="rgba(123,97,255,0.3)" color="var(--accent2)">
          {activePreset.name}
        </Pill>
      )}

      {textOverrides.length > 0 && (
        <Pill borderColor="rgba(123,97,255,0.2)" color="var(--text-muted)">
          {textOverrides.length} text override{textOverrides.length !== 1 ? "s" : ""}
        </Pill>
      )}

      {swappedAssets > 0 && (
        <Pill borderColor="rgba(255,92,87,0.2)" color="var(--text-muted)">
          {swappedAssets} image{swappedAssets !== 1 ? "s" : ""} detected
        </Pill>
      )}

      {changesCount > 0 && (
        <Pill borderColor="rgba(255,92,87,0.3)" color="var(--accent3)">
          Unsaved changes
        </Pill>
      )}
    </div>
  );
}

function Pill({ children, color, borderColor }: {
  children: React.ReactNode;
  color: string;
  borderColor: string;
}) {
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "5px 12px",
      background: "var(--surface)",
      border: `1px solid ${borderColor}`,
      borderRadius: 20,
      fontSize: 11,
      fontFamily: "var(--font-syne), sans-serif",
      fontWeight: 600,
      color,
    }}>{children}</div>
  );
}
