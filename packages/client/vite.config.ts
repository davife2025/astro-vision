import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ isPreview }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: isPreview
      ? undefined
      : {
          "/api": {
            target: "http://localhost:3001",
            changeOrigin: true,
          },
        },
  },
  preview: {
    allowedHosts: ["astro-vision-1.onrender.com"],
  },
}));
