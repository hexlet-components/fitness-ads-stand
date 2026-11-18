import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// GitHub Pages отдаёт сайт из подкаталога с именем репозитория.
export default defineConfig({
  base: "/fitness-ads-stand/",
  plugins: [tailwindcss()],
});
