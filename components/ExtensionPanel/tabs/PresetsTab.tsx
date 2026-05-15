"use client";

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
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase" as const,
      color: "var(--text-muted)",
      marginBottom: 10,
    }}>{children}</div>
  );
}

export default function PresetsTab() {
  const { presets, activePresetId, setActivePreset, savePreset, currentSite } = usePixelMorph();
  const activePreset = presets.find(p => p.id === activePresetId);

  return (
    <div>
      <Section>
        <SectionTitle>Saved Presets</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {presets.map(preset => {
            const isActive = preset.id === activePresetId;
            return (
              <div
                key={preset.id}
                onClick={() => setActivePreset(preset.id)}
                style={{
                  position: "relative",
                  background: "var(--surface3)",
                  borderRadius: "var(--radius)",
                  border: `1px solid ${isActive ? "var(--accent2)" : "transparent"}`,
                  cursor: "pointer",
                  overflow: "hidden",
                  transition: "border-color 150ms",
                }}
              >
                <div style={{ display: "flex", height: 28 }}>
                  {preset.swatches.map((color, i) => (
                    <div key={i} style={{ flex: 1, background: color }} />
                  ))}
                </div>
                <div style={{ padding: "8px 10px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>
                    {preset.name}
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-dm-mono), monospace",
                  }}>
                    {preset.modCount} mods
                  </div>
                </div>
                {isActive && (
                  <div style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "var(--accent2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}

          <div
            onClick={savePreset}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              border: "1.5px dashed var(--border-hover)",
              borderRadius: "var(--radius)",
              cursor: "pointer",
              padding: "20px 10px",
              color: "var(--text-muted)",
              minHeight: 72,
              transition: "border-color 150ms, color 150ms",
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
            <span style={{ fontSize: 11, fontFamily: "var(--font-syne), sans-serif" }}>Save current</span>
          </div>
        </div>
      </Section>

      <Section noBorder>
        <SectionTitle>Auto-Reapply</SectionTitle>
        {activePreset ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            background: "var(--surface3)",
            borderRadius: "var(--radius)",
            border: "1px solid rgba(200,245,66,0.12)",
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--accent)",
              animation: "pulse-dot 2s infinite",
              flexShrink: 0,
            }} />
            <div style={{ flex: 1, overflow: "hidden" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                {activePreset.name}
              </span>
              <span style={{
                marginLeft: 8,
                fontFamily: "var(--font-dm-mono), monospace",
                fontSize: 11,
                color: "var(--text-muted)",
              }}>{currentSite}</span>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "4px 0" }}>
            No preset active for this site.
          </div>
        )}
      </Section>
    </div>
  );
}
