export const routes = [
  {
    name: "about",
    pathname: "/about",
    module: "./routes/about.tsx",
  },
  {
    name: "index",
    pathname: "/",
    module: "./routes/index.tsx",
  },
  {
    name: "news",
    pathname: "/news",
    module: "./routes/news.tsx",
  },
];

export const middlewares = [
  {
    pathname: "{/*}?",
    module: "./routes/_middleware.ts",
  },
];

export const notFound = {
  name: "_404",
  pathname: "/_404",
  module: "./routes/_404.tsx",
};
