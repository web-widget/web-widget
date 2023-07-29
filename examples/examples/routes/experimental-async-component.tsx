import { type RouteComponentProps } from "@web-widget/react";
import type { HelloData } from "./api/hello-world";

export { render } from "@web-widget/react";

async function fetchData(url: URL) {
  const data = await fetch(`${url.origin}/api/hello-world`);
  return (await data.json()) as HelloData;
}

export default async function Page({ url }: RouteComponentProps) {
  const data = await fetchData(url);
  return (
    <>
      <h1>Async component(experimental)</h1>
      <ul>
        {data.map((item, index) => {
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
