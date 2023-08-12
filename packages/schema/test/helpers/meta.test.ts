import { expect, test } from "@jest/globals";

import { mergeMeta } from "../../src/helpers/meta";

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
          scopes: {},
        }),
      },
    ],
  });
});
