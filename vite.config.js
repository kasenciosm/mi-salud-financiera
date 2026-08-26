import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Impide que Vite tome por error un postcss.config.* ubicado en una
  // carpeta superior, como Descargas en Windows.
  css: {
    postcss: { plugins: [] },
  },
  server: {
    port: 5173,
  },
});
