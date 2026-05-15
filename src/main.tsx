import React from "react";
import ReactDOM from "react-dom/client";
import { PixelMorphProvider } from "@/context/PixelMorphContext";
import ExtensionPanel from "@/components/ExtensionPanel";
import "@/app/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <PixelMorphProvider>
    <div style={{ width: 380, height: 580, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <ExtensionPanel />
    </div>
  </PixelMorphProvider>
);
