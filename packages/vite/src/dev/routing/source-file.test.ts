import { assert, test } from "vitest";
import { getSourceFile } from "./source-file";

[
  {
    fileName: "_404.route.md",
    expect: {
      type: "fallback",
      name: "_404",
      ext: ".md",
    },
  },
  {
    fileName: "_404.route.tsx",
    expect: {
      type: "fallback",
      name: "_404",
      ext: ".tsx",
    },
  },
  {
    fileName: "_500.route.tsx",
    expect: {
      type: "fallback",
      name: "_500",
      ext: ".tsx",
    },
  },
  {
    fileName: "index.route.tsx",
    expect: {
      type: "route",
      name: "index",
      ext: ".tsx",
    },
  },
  {
    fileName: "root.layout.tsx",
    expect: {
      type: "layout",
      name: "root",
      ext: ".tsx",
    },
  },
  {
    fileName: "[...all].middleware.ts",
    expect: {
      type: "middleware",
      name: "[...all]",
      ext: ".ts",
    },
  },
  {
    fileName: "entry.md",
    expect: null,
  },
  {
    fileName: "service-worker.tsx",
    expect: null,
  },
  {
    fileName: "menu.mdx",
    expect: null,
  },
  {
    fileName: "menu.tsx",
    expect: null,
  },
  {
    fileName: "layout-name!.jsx",
    expect: {
      type: "layout",
      name: "layout-name!",
      ext: ".jsx",
    },
  },
  {
    fileName: "layout-name.jsx",
    expect: {
      type: "layout",
      name: "layout-name",
      ext: ".jsx",
    },
  },
  {
    fileName: "layout@name.jsx",
    expect: null,
  },
  {
    fileName: "layout!.jsx",
    expect: {
      type: "layout",
      name: "layout!",
      ext: ".jsx",
    },
  },
  {
    fileName: "layout.jsx",
    expect: {
      type: "layout",
      name: "layout",
      ext: ".jsx",
    },
  },
  {
    fileName: "layout!.js",
    expect: {
      type: "layout",
      name: "layout!",
      ext: ".js",
    },
  },
  {
    fileName: "layout.js",
    expect: {
      type: "layout",
      name: "layout",
      ext: ".js",
    },
  },
  {
    fileName: "layout.css",
    expect: null,
  },
  {
    fileName: "index.css",
    expect: null,
  },
  {
    fileName: "index.css.ts",
    expect: null,
  },
  {
    fileName: "index.scss.ts",
    expect: null,
  },
  {
    fileName: "index.tsx.json",
    expect: null,
  },
  {
    fileName: "index.d.ts",
    expect: null,
  },
].forEach((t) => {
  test(`getSourceFile ${t.fileName}`, () => {
    const s = getSourceFile(t.fileName);
    if (s == null || t.expect == null) {
      assert.equal(s, t.expect, t.fileName);
    } else {
      assert.equal(s.type, t.expect.type, t.fileName);
      assert.equal(s.name, t.expect.name, t.fileName);
      assert.equal(s.ext, t.expect.ext, t.fileName);
    }
  });
});
