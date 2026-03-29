import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@react-three/drei")) return "vendor-r3f-drei";
          if (id.includes("@react-three/fiber")) return "vendor-r3f-core";
          if (id.includes("three/examples/jsm")) return "vendor-three-examples";
          if (id.includes("three")) return "vendor-three";
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8808",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, "/v1"),
      },
    },
  },
});
