import type { Handlers, RouteComponentProps } from "@web-widget/react";
export { render } from "@web-widget/react";

import demoDataUrl from "../public/data.json?url";

type FetchingPageData = {
  list: {
    title: string;
    url: string;
  }[];
};

export const handler: Handlers<FetchingPageData> = {
  async GET(ctx) {
    const data = await fetch(demoDataUrl);
    return ctx.render({
      data: await data.json(),
    });
  },
};

export default function Page(props: RouteComponentProps<FetchingPageData>) {
  const {
    data: { list },
  } = props;
  return (
    <>
      <h1>Fetching data</h1>
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
