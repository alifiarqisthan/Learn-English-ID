import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Split large vendor libraries into separate chunks so users only re-download
    // the chunks that changed between deploys (better browser caching).
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React (stable, rarely updates)
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          // UI components (Radix + lucide icons + utility libs)
          "ui-vendor": [
            "lucide-react",
            "@radix-ui/react-slot",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-progress",
            "@radix-ui/react-separator",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "class-variance-authority",
            "clsx",
            "tailwind-merge",
          ],
          // Markdown rendering (only used on lesson pages)
          "markdown-vendor": ["react-markdown", "remark-gfm"],
        },
      },
    },
    // Increase chunk size warning threshold to 600 KB — our manual chunks are ~500 KB each.
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
