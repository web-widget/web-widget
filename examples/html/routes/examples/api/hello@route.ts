import { defineRouteHandler } from '@web-widget/helpers';

export type HelloData = {
  title: string;
  url: string;
}[];

export const handler = defineRouteHandler({
  async GET() {
    const data: HelloData = [
      {
        title: `console.log('hello world')`,
        url: '#id0',
      },
      {
        title: `echo "hello world"`,
        url: '#id1',
      },
      {
        title: `print('hello world')`,
        url: '#id2',
      },
      {
        title: `println!("Hello, World")`,
        url: '#id3',
      },
    ];
    return Response.json(data);
  },
});
