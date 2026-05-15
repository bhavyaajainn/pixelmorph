"use client";

import { usePixelMorph } from "@/context/PixelMorphContext";
import { CaptureButton, ResetButton } from "./ColorsTab";

export default function ResourcesTab() {
  const { isCapturing, captureError, captureResources, resetResources, capturedImages, capturedBackgrounds } = usePixelMorph();
  const hasData = capturedImages.length > 0 || capturedBackgrounds.length > 0;

  return (
    <div>
      {/* Capture */}
      <Section>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <CaptureButton
              label={hasData ? "↻ Rescan Page Resources" : "Capture Page Resources"}
              loading={isCapturing}
              onClick={captureResources}
            />
          </div>
          {hasData && <ResetButton onClick={resetResources} />}
        </div>
        {captureError && (
          <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(255,92,87,0.1)", borderRadius: "var(--radius)", border: "1px solid rgba(255,92,87,0.3)", fontSize: 11, color: "#FF5C57" }}>
            {captureError}
          </div>
        )}
        {!hasData && !isCapturing && !captureError && (
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5, textAlign: "center" }}>
            Detects images and CSS backgrounds from the active page.
          </p>
        )}
      </Section>

      {/* Images */}
      {capturedImages.length > 0 && (
        <Section>
          <Label>Images &amp; Logos <Ct n={capturedImages.length} /></Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {capturedImages.map(img => (
              <ResourceRow
                key={img.id}
                thumb={<img src={img.src} alt={img.alt} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 3 }} />}
                name={img.src.split("/").pop()?.split("?")[0] || "image"}
                meta={[img.alt || "no alt", img.width && img.height ? `${img.width}×${img.height}` : "", img.context].filter(Boolean).join(" · ")}
                action="Swap"
              />
            ))}
          </div>
        </Section>
      )}

      {/* Backgrounds */}
      {capturedBackgrounds.length > 0 && (
        <Section noBorder>
          <Label>CSS Backgrounds <Ct n={capturedBackgrounds.length} /></Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {capturedBackgrounds.map(bg => (
              <ResourceRow
                key={bg.id}
                thumb={<div style={{ width: "100%", height: "100%", backgroundImage: `url(${bg.src})`, backgroundSize: "cover", backgroundPosition: "center", borderRadius: 3 }} />}
                name={bg.src.split("/").pop()?.split("?")[0] || "background"}
                meta={bg.context}
                action="Edit"
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function ResourceRow({ thumb, name, meta, action }: { thumb: React.ReactNode; name: string; meta: string; action: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--surface3)", borderRadius: "var(--radius)" }}>
      <div style={{ width: 38, height: 38, borderRadius: 4, flexShrink: 0, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", background: "var(--surface2)" }}>
        {thumb}
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        <div style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{meta}</div>
      </div>
      <button style={{ padding: "4px 10px", background: "rgba(123,97,255,0.12)", border: "1px solid rgba(123,97,255,0.25)", borderRadius: 5, color: "var(--accent2)", fontSize: 11, fontFamily: "var(--font-syne), sans-serif", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
        {action}
      </button>
    </div>
  );
}

function Section({ children, noBorder }: { children: React.ReactNode; noBorder?: boolean }) {
  return <div style={{ padding: "12px 14px", borderBottom: noBorder ? "none" : "1px solid var(--border)" }}>{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>{children}</div>;
}

function Ct({ n }: { n: number }) {
  return <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.6 }}>({n})</span>;
}
