import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const allowedHosts = ["mediumvioletred-rhinoceros-257319.hostingersite.com"];

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts,
  },
  preview: {
    allowedHosts,
  },
});
