import type { RouteHandlers } from "@web-widget/schema";

export type HelloData = {
  title: string;
  url: string;
}[];

export const handler: RouteHandlers = {
  async GET() {
    const data: HelloData = [
      {
        title: "👋🌍",
        url: "#id0",
      },
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
      {
        title: "مرحبا بالعالم",
        url: "#id4",
      },
      {
        title: "헬로월드",
        url: "#id5",
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
