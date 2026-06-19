import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// Static, client-only app: no server, no proxy. chess.js is the only legality
// engine and the analyzer is pure TypeScript bundled into the client.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(here, "./src"),
    },
  },
  // Dev/preview only (no effect on the static production build): allow reaching the
  // dev server via the office's tailscale hostname, not just an IP literal.
  server: {
    allowedHosts: ["auntie"],
  },
});
