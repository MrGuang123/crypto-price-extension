import { defineConfig } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    assetsDir: ".",
    rollupOptions: {
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
      input: {
        main: resolve(__dirname, "index.html"),
      },
    },
  },
  plugins: [react()],
});
