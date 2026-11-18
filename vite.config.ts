import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// GitHub Pages отдаёт сайт из подкаталога с именем репозитория. Страница менеджера
// лежит в manager/, на сервере студента её отдаёт Caddy по тому же пути.
export default defineConfig({
  base: "/fitness-ads-stand/",
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        manager: resolve(import.meta.dirname, "manager/index.html"),
      },
    },
  },
});
