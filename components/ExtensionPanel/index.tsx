"use client";

import PanelHeader from "./PanelHeader";
import PanelFooter from "./PanelFooter";
import Inspector from "./Inspector";

export default function ExtensionPanel() {
  return (
    <div style={{
      width: "var(--panel-width)",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "var(--surface)",
    }}>
      <PanelHeader />
      <Inspector />
      <PanelFooter />
    </div>
  );
}
