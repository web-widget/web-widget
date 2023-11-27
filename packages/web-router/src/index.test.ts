import WebRouter from ".";

describe("Basic", () => {
  const app = new WebRouter({
    routes: [
      {
        pathname: "/hello",
        module: {
          handler: {
            GET(context) {
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
      module: {},
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
