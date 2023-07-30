import type { Handlers, RouteComponentProps } from "@web-widget/react";
import type { HelloData } from "./api/hello-world";
import BaseLayout from "../components/BaseLayout";

export { render } from "@web-widget/react";

async function fetchData(url: URL) {
  const data = await fetch(`${url.origin}/api/hello-world`);
  return (await data.json()) as HelloData;
}

export const handler: Handlers<HelloData> = {
  async GET(ctx) {
    const data = await fetchData(new URL(ctx.request.url));
    return ctx.render({
      data,
    });
  },
};

export default function Page({ data }: RouteComponentProps<HelloData>) {
  return (
    <BaseLayout>
      <h1>Fetching data</h1>
      <ul>
        {data.map((item, index) => {
          return (
            <li key={index}>
              <a href={item.url}>{item.title}</a>
            </li>
          );
        })}
      </ul>
    </BaseLayout>
  );
}
