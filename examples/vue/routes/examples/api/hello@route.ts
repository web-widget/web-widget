import { defineRouteHandler } from '@web-widget/helpers';

export type HelloData = {
  title: string;
  url: string;
}[];

export const handler = defineRouteHandler({
  async GET() {
    const data: HelloData = [
      {
        title: '👋🌍',
        url: '#id0',
      },
      {
        title: '你好世界',
        url: '#id1',
      },
      {
        title: 'Hello world',
        url: '#id2',
      },
      {
        title: 'こんにちは世界',
        url: '#id3',
      },
    ];
    return Response.json(data);
  },
});
