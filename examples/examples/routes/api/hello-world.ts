import type { RouteHandlers } from "@web-widget/schema";

export type HelloData = {
  title: string;
  url: string;
}[];

export const handler: RouteHandlers = {
  async GET() {
    const data: HelloData = [
      {
        title: "你好世界",
        url: "#id1",
      },
      {
        title: "Hello world",
        url: "#id2",
      },
      {
        title: "こんにちは世界",
        url: "#id3",
      },
    ];
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    });
  },
};
