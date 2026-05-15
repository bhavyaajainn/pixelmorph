import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
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
});
