import { render } from "@web-widget/react";

export { render };

type NewsData = {
  list: {
    title: string;
    url: string;
  }[];
};

async function getNewsData() {
  const data = await fetch(new URL("../public/data.json", import.meta.url));
  const json = (await data.json()) as NewsData;
  return json;
}

export default async function Page() {
  const { list } = await getNewsData();
  return (
    <>
      <h1>Async component(experimental)</h1>
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
