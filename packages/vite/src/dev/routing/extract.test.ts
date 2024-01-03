import { assert, expect, test } from "vitest";
import { pathToPattern, sortRoutePaths } from "./extract";

test("pathToPattern", async (t) => {
  test("creates pattern", () => {
    assert(pathToPattern("foo/bar"), "/foo/bar");
  });

  test("parses index routes", () => {
    assert(pathToPattern("foo/index"), "/foo");
  });

  test("parses parameters", () => {
    assert(pathToPattern("foo/[name]"), "/foo/:name");
    assert(pathToPattern("foo/[name]/bar/[bob]"), "/foo/:name/bar/:bob");
  });

  test("parses catchall", () => {
    assert(pathToPattern("foo/[...name]"), "/foo/:name*");
  });

  test("parses multiple params in same part", () => {
    assert(pathToPattern("foo/[mod]@[version]"), "/foo/:mod@:version");
    assert(pathToPattern("foo/[bar].json"), "/foo/:bar.json");
    assert(pathToPattern("foo/foo[bar]"), "/foo/foo:bar");
  });

  test("parses optional params", () => {
    assert(pathToPattern("foo/[[name]]"), "/foo{/:name}?");
    assert(pathToPattern("foo/[name]/[[bob]]"), "/foo/:name{/:bob}?");
    assert(pathToPattern("foo/[[name]]/bar"), "/foo{/:name}?/bar");
    assert(
      pathToPattern("foo/[[name]]/bar/[[bob]]"),
      "/foo{/:name}?/bar{/:bob}?"
    );
  });

  test("throws on invalid patterns", () => {
    expect(() => pathToPattern("foo/[foo][bar]")).toThrowError();
    expect(() => pathToPattern("foo/foo]")).toThrowError();
    expect(() => pathToPattern("foo/[foo]]")).toThrowError();
    expect(() => pathToPattern("foo/foo-[[name]]-bar/baz")).toThrowError();
    expect(() => pathToPattern("foo/[[name]]-bar/baz")).toThrowError();
    expect(() => pathToPattern("foo/foo-[[name]]/baz")).toThrowError();
    expect(() => pathToPattern("foo/foo-[[name]]")).toThrowError();
    expect(() => pathToPattern("foo/[[name]]-bar")).toThrowError();
  });
});

test("sortRoutePaths", () => {
  const routes = [
    "/foo/[id]",
    "/foo/[...slug]",
    "/foo/bar",
    "/foo/_layout",
    "/foo/index",
    "/foo/_middleware",
    "/foo/bar/_middleware",
    "/foo/bar/index",
    "/foo/bar/[...foo]",
    "/foo/bar/baz",
    "/foo/bar/_layout",
  ];
  const sorted = [
    "/foo/_middleware",
    "/foo/_layout",
    "/foo/bar",
    "/foo/index",
    "/foo/bar/_middleware",
    "/foo/bar/_layout",
    "/foo/bar/index",
    "/foo/bar/baz",
    "/foo/bar/[...foo]",
    "/foo/[id]",
    "/foo/[...slug]",
  ];
  routes.sort(sortRoutePaths);
  assert.equal(routes, sorted);
});
