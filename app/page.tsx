import { PixelMorphProvider } from "@/context/PixelMorphContext";
import ExtensionPanel from "@/components/ExtensionPanel";
import BrowserMockup from "@/components/BrowserMockup";

export default function Home() {
  return (
    <PixelMorphProvider>
      <div style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg)",
      }}>
        <ExtensionPanel />
        <BrowserMockup />
      </div>
    </PixelMorphProvider>
  );
}
