import { defineConfig } from "@web-widget/builder";
import vue from "@vitejs/plugin-vue";
import react from "@web-widget/react/vite-plugin";

export default defineConfig({
  input: {
    routes: [
      {
        name: "index",
        pathname: "/",
        module: "./routes/index.tsx",
      },
      {
        name: "about",
        pathname: "/about",
        module: "./routes/about.tsx",
      },
      {
        name: "news",
        pathname: "/news",
        module: "./routes/news.tsx",
      },
      {
        name: "fallback",
        pathname: "/fallback",
        module: "./routes/fallback.tsx",
      },
    ],
    middlewares: [
      {
        pathname: "{/*}?",
        module: "./routes/_middleware.ts",
      },
    ],
    notFound: {
      name: "_404",
      pathname: "/_404",
      module: "./routes/_404.tsx",
    },
  },
  vite: {
    plugins: [react(), vue()],
  },
});
