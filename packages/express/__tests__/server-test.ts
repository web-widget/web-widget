import express from "express";
import supertest from "supertest";
import { createRequest, createResponse } from "node-mocks-http";
import {
  createRequestHandler as createWebRequestHandler,
  Response as NodeResponse,
} from "@web-widget/web-std";
import { Readable } from "stream";

import {
  createWebHeaders,
  createWebRequest,
  createRequestHandler,
} from "../server";

// We don't want to test that the remix server works here (that's what the
// puppetteer tests do), we just want to test the express adapter
jest.mock("@web-widget/web-std", () => {
  let original = jest.requireActual("@web-widget/web-std");
  return {
    ...original,
    createRequestHandler: jest.fn(),
  };
});
let mockedCreateRequestHandler =
  createWebRequestHandler as jest.MockedFunction<
    typeof createWebRequestHandler
  >;

function createApp() {
  let app = express();

  app.all(
    "*",
    // We don't have a real app to test, but it doesn't matter. We won't ever
    // call through to the real createRequestHandler
    // @ts-expect-error
    createRequestHandler({ build: undefined })
  );

  return app;
}

describe("express createRequestHandler", () => {
  describe("basic requests", () => {
    afterEach(() => {
      mockedCreateRequestHandler.mockReset();
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    it("handles requests", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async (req) => {
        return new Response(`URL: ${new URL(req.url).pathname}`);
      });

      let request = supertest(createApp());
      let res = await request.get("/foo/bar");

      expect(res.status).toBe(200);
      expect(res.text).toBe("URL: /foo/bar");
      expect(res.headers["x-powered-by"]).toBe("Express");
    });

    it("handles root // URLs", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async (req) => {
        return new Response("URL: " + new URL(req.url).pathname);
      });

      let request = supertest(createApp());
      let res = await request.get("//");

      expect(res.status).toBe(200);
      expect(res.text).toBe("URL: //");
    });

    it("handles nested // URLs", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async (req) => {
        return new Response("URL: " + new URL(req.url).pathname);
      });

      let request = supertest(createApp());
      let res = await request.get("//foo//bar");

      expect(res.status).toBe(200);
      expect(res.text).toBe("URL: //foo//bar");
    });

    it("handles null body", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async () => {
        return new Response(null, { status: 200 });
      });

      let request = supertest(createApp());
      let res = await request.get("/");

      expect(res.status).toBe(200);
    });

    // https://github.com/node-fetch/node-fetch/blob/4ae35388b078bddda238277142bf091898ce6fda/test/response.js#L142-L148
    it("handles body as stream", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async () => {
        let stream = Readable.from("hello world");
        return new NodeResponse(stream, { status: 200 }) as unknown as Response;
      });

      let request = supertest(createApp());
      let res = await request.get("/");
      expect(res.status).toBe(200);
      expect(res.text).toBe("hello world");
    });

    it("handles status codes", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async () => {
        return new Response(null, { status: 204 });
      });

      let request = supertest(createApp());
      let res = await request.get("/");

      expect(res.status).toBe(204);
    });

    it("sets headers", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async () => {
        let headers = new Headers({ "X-Time-Of-Year": "most wonderful" });
        headers.append(
          "Set-Cookie",
          "first=one; Expires=0; Path=/; HttpOnly; Secure; SameSite=Lax"
        );
        headers.append(
          "Set-Cookie",
          "second=two; MaxAge=1209600; Path=/; HttpOnly; Secure; SameSite=Lax"
        );
        headers.append(
          "Set-Cookie",
          "third=three; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Path=/; HttpOnly; Secure; SameSite=Lax"
        );
        return new Response(null, { headers });
      });

      let request = supertest(createApp());
      let res = await request.get("/");

      expect(res.headers["x-time-of-year"]).toBe("most wonderful");
      expect(res.headers["set-cookie"]).toEqual([
        "first=one; Expires=0; Path=/; HttpOnly; Secure; SameSite=Lax",
        "second=two; MaxAge=1209600; Path=/; HttpOnly; Secure; SameSite=Lax",
        "third=three; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Path=/; HttpOnly; Secure; SameSite=Lax",
      ]);
    });
  });
});

describe("express createWebHeaders", () => {
  describe("creates fetch headers from express headers", () => {
    it("handles empty headers", () => {
      let headers = createWebHeaders({});
      expect(headers.raw()).toMatchInlineSnapshot(`Object {}`);
    });

    it("handles simple headers", () => {
      let headers = createWebHeaders({ "x-foo": "bar" });
      expect(headers.get("x-foo")).toBe("bar");
    });

    it("handles multiple headers", () => {
      let headers = createWebHeaders({ "x-foo": "bar", "x-bar": "baz" });
      expect(headers.get("x-foo")).toBe("bar");
      expect(headers.get("x-bar")).toBe("baz");
    });

    it("handles headers with multiple values", () => {
      let headers = createWebHeaders({
        "x-foo": ["bar", "baz"],
        "x-bar": "baz",
      });
      expect(headers.getAll("x-foo")).toEqual(["bar", "baz"]);
      expect(headers.get("x-bar")).toBe("baz");
    });

    it("handles multiple set-cookie headers", () => {
      let headers = createWebHeaders({
        "set-cookie": [
          "__session=some_value; Path=/; Secure; HttpOnly; MaxAge=7200; SameSite=Lax",
          "__other=some_other_value; Path=/; Secure; HttpOnly; Expires=Wed, 21 Oct 2015 07:28:00 GMT; SameSite=Lax",
        ],
      });
      expect(headers.getAll("set-cookie")).toEqual([
        "__session=some_value; Path=/; Secure; HttpOnly; MaxAge=7200; SameSite=Lax",
        "__other=some_other_value; Path=/; Secure; HttpOnly; Expires=Wed, 21 Oct 2015 07:28:00 GMT; SameSite=Lax",
      ]);
    });
  });
});

describe("express createWebRequest", () => {
  it("creates a request with the correct headers", async () => {
    let expressRequest = createRequest({
      url: "/foo/bar",
      method: "GET",
      protocol: "http",
      hostname: "localhost",
      headers: {
        "Cache-Control": "max-age=300, s-maxage=3600",
        Host: "localhost:3000",
      },
    });
    let expressResponse = createResponse();

    let remixRequest = createWebRequest(expressRequest, expressResponse);

    expect(remixRequest.method).toBe("GET");
    expect(remixRequest.headers.get("cache-control")).toBe(
      "max-age=300, s-maxage=3600"
    );
    expect(remixRequest.headers.get("host")).toBe("localhost:3000");
  });
});
