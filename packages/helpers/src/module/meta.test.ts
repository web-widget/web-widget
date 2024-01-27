import { expect, test } from "@jest/globals";
import { mergeMeta, rebaseMeta, renderMetaToString } from "./meta";

test("Should return the new object", () => {
  const defaults = {
    meta: [],
  };
  const overrides = {
    meta: [],
  };
  const result = mergeMeta(defaults, overrides);
  expect(result).not.toBe(defaults);
  expect(result).not.toBe(overrides);
  expect(result.meta).not.toBe(defaults.meta);
  expect(result.meta).not.toBe(overrides.meta);
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

test("should override the same meta", () => {
  const defaults = {
    meta: [
      {
        name: "keywords",
        content: "a, b",
      },
      {
        property: "og:title",
        content: "Introducing our New Site",
      },
      {
        name: "hello",
        content: "world",
      },
    ],
  };
  const overrides = {
    meta: [
      {
        name: "keywords",
        content: "c, d",
      },
      {
        property: "og:title",
        content: "New Site",
      },
      {
        property: "og:url",
        content: "http://newsblog.org/news/136756249803614",
      },
    ],
  };
  const result = mergeMeta(defaults, overrides);
  expect(result).toEqual({
    meta: [
      {
        name: "keywords",
        content: "c, d",
      },
      {
        property: "og:title",
        content: "New Site",
      },
      {
        name: "hello",
        content: "world",
      },
      {
        property: "og:url",
        content: "http://newsblog.org/news/136756249803614",
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

test("Content should be escaped", () => {
  const meta = {
    title: `"'&<>`,
    meta: [
      {
        name: "test",
        content: `"'&<>`,
      },
      {
        [`"'&<>`]: `"'&<>`,
      },
    ],
  };
  expect(renderMetaToString(meta)).toEqual(
    `<title >&quot;&#39;&amp;&lt;&gt;</title><meta name="test" content="&quot;&#39;&amp;&lt;&gt;" />` +
      `<meta &quot;&#39;&amp;&lt;&gt;="&quot;&#39;&amp;&lt;&gt;" />`
  );
});

test("Raw text should be processed correctly", () => {
  const meta = {
    style: [
      {
        content: `/*"'&<>*/`,
      },
    ],
    script: [
      {
        content: `/*"'&<>*/`,
      },
    ],
  };
  expect(renderMetaToString(meta)).toEqual(
    `<style >/*"'&<>*/</style><script >/*"'&<>*/</script>`
  );
});
