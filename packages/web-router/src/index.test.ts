import type { LayoutModule } from ".";
import WebRouter from ".";
import * as defaultLayoutModule from "./layout";

describe("Basic", () => {
  const app = new WebRouter({
    routes: [
      {
        pathname: "/hello",
        module: {
          handler: {
            GET() {
              return new Response("get hello");
            },
            POST() {
              return new Response("post hello");
            },
          },
        },
      },
    ],
    layout: {
      module: defaultLayoutModule as LayoutModule,
    },
    middlewares: [],
    fallbacks: [],
  });

  it("GET http://localhost/hello is ok", async () => {
    const res = await app.request("http://localhost/hello");
    expect(res).not.toBeNull();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("get hello");
  });

  it("POST http://localhost/hello is ok", async () => {
    const res = await app.request("http://localhost/hello", {
      method: "POST",
    });
    expect(res).not.toBeNull();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("post hello");
  });
});

describe("Multiple identical routes", () => {
  const app = new WebRouter({
    routes: [
      {
        pathname: "/:lang?/",
        module: {
          handler: () => new Response("Home"),
        },
      },
      {
        pathname: "/:lang?/a/",
        module: {
          handler: () => new Response("a"),
        },
      },
      {
        pathname: "/:lang?/b/",
        module: {
          handler: () => new Response("b"),
        },
      },
    ],
    layout: {
      module: defaultLayoutModule as LayoutModule,
    },
    middlewares: [],
    fallbacks: [],
  });

  it("GET http://localhost/ is ok", async () => {
    const res = await app.request("http://localhost/");
    expect(res).not.toBeNull();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Home");
  });

  it("POST http://localhost/a/ is ok", async () => {
    const res = await app.request("http://localhost/a/");
    expect(res).not.toBeNull();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Home");
  });

  it("POST http://localhost/b/ is ok", async () => {
    const res = await app.request("http://localhost/b/");
    expect(res).not.toBeNull();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Home");
  });
});
