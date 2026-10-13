import { defineConfig } from "vite";
export default defineConfig({
  build: { rollupOptions: { input: { village: "index.html", world: "world.html", lab: "style-lab.html", island: "island.html" } } },
});
