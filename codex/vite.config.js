import { defineConfig } from "vite";
export default defineConfig({
  build: { rollupOptions: { input: { world: "index.html", lab: "style-lab.html" } } },
});
