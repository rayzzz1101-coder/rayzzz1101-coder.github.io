import { resolve } from "node:path";
import { defineConfig } from "vite";


export default defineConfig({
  base: "/",
  build: {
    rollupOptions: {
      input: {
        admin: resolve(process.cwd(), "admin.html"),
        homepage: resolve(process.cwd(), "index.html"),
        notes: resolve(process.cwd(), "notes.html"),
        impressions: resolve(process.cwd(), "impressions.html"),
        bubbles: resolve(process.cwd(), "bubbles.html"),
        interview: resolve(process.cwd(), "interview.html"),
        scroll: resolve(process.cwd(), "scroll.html"),
      },
    },
  },
});
