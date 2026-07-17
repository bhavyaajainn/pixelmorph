import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
  plugins: [react()],
  define: {
    "process.env.NEXT_PUBLIC_GEMINI_API_KEY": JSON.stringify(env.NEXT_PUBLIC_GEMINI_API_KEY ?? ""),
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  css: {
    postcss: "./postcss.config.mjs",
  },
  build: {
    outDir: "extension",
    emptyOutDir: true,
    rollupOptions: {
      input: { popup: path.resolve(__dirname, "popup.html") },
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[chunk]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
  publicDir: "public",
  };
});
