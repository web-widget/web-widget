import type { Handlers, RouteComponentProps } from "@web-widget/react";
export { render } from "@web-widget/react";

type NewsPageProps = {
  list: {
    title: string;
    url: string;
  }[];
};

export const handler: Handlers<NewsPageProps> = {
  async GET(req, ctx) {
    const data = await fetch(new URL("../public/data.json", import.meta.url));
    return ctx.render({
      data: await data.json(),
    });
  },
};

export default function NewsPage(props: RouteComponentProps<NewsPageProps>) {
  const {
    data: { list },
  } = props;
  return (
    <>
      <h1>News</h1>
      <ul>
        {list.map((item, index) => {
          return (
            <li key={index}>
              <a href={item.url}>{item.title}</a>
            </li>
          );
        })}
      </ul>
    </>
  );
}
