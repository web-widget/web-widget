import { expect, test } from "@jest/globals";

import { mergeMeta, rebaseMeta } from "../../src/helpers/meta";

test("Should return the new object", () => {
  const defaults = {};
  const overrides = {};
  const result = mergeMeta(defaults, overrides);
  expect(result).not.toBe(defaults);
  expect(result).not.toBe(overrides);
});

test("Should cover content", () => {
  const defaults = {
    title: "a",
  };
  const overrides = {
    title: "b",
  };
  const result = mergeMeta(defaults, overrides);
  expect(result).toEqual({
    title: "b",
  });
});

test("Should be inserted at the end of the array", () => {
  const defaults = {
    link: [{ rel: "a", href: "/a" }],
  };
  const overrides = {
    link: [{ rel: "b", href: "/b" }],
  };
  const result = mergeMeta(defaults, overrides);
  expect(result).toEqual({
    link: [...defaults.link, ...overrides.link],
  });
});

test("Should override content of duplicate meta[name]", () => {
  const defaults = {
    meta: [
      {
        name: "keywords",
        content: "a, b",
      },
    ],
  };
  const overrides = {
    meta: [
      {
        name: "keywords",
        content: "c, d",
      },
    ],
  };
  const result = mergeMeta(defaults, overrides);
  expect(result).toEqual(overrides);
});

test("The content of script[type='importmap'] that should be merged", () => {
  const defaultsImportMap = {
    imports: {
      "#pkg": "/assets/pkg.js",
    },
    scopes: {
      "https://cdn.io/": {
        lib: "https://cdn.io/:npm/lib/index.js",
      },
    },
  };
  const defaults = {
    script: [
      {
        type: "importmap",
        content: JSON.stringify(defaultsImportMap),
      },
    ],
  };
  const overrideImportMap = {
    imports: {
      "#ui": "/assets/ui.js",
    },
    scopes: {
      "https://cdn.io/": {
        lib2: "https://cdn.io/:npm/lib2/index.js",
      },
    },
  };
  const overrides = {
    script: [
      {
        type: "importmap",
        content: JSON.stringify(overrideImportMap),
      },
    ],
  };
  const result = mergeMeta(defaults, overrides);
  expect(result).toEqual({
    script: [
      {
        type: "importmap",
        content: JSON.stringify({
          imports: {
            ...defaultsImportMap.imports,
            ...overrideImportMap.imports,
          },
          scopes: {
            ...defaultsImportMap.scopes,
            ...overrideImportMap.scopes,
          },
        }),
      },
    ],
  });
});

test("Relative paths should be converted to absolute paths", () => {
  const meta = {
    link: [
      { href: "a.css" },
      { href: "./b.css" },
      { href: "../c.css" },
      { href: "/d.css" },
    ],
    script: [
      { src: "a.js" },
      { src: "./b.js" },
      { src: "../c.js" },
      { src: "/d.js" },
    ],
  };

  expect(rebaseMeta(meta, "https://cdn.com/assets/")).toEqual({
    link: [
      { href: "https://cdn.com/assets/a.css" },
      { href: "https://cdn.com/assets/b.css" },
      { href: "https://cdn.com/c.css" },
      { href: "/d.css" },
    ],
    script: [
      { src: "https://cdn.com/assets/a.js" },
      { src: "https://cdn.com/assets/b.js" },
      { src: "https://cdn.com/c.js" },
      { src: "/d.js" },
    ],
  });

  expect(rebaseMeta(meta, "/assets/")).toEqual({
    link: [
      { href: "/assets/a.css" },
      { href: "/assets/b.css" },
      { href: "/c.css" },
      { href: "/d.css" },
    ],
    script: [
      { src: "/assets/a.js" },
      { src: "/assets/b.js" },
      { src: "/c.js" },
      { src: "/d.js" },
    ],
  });
});
