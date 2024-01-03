import type { Handlers, RouteComponentProps, Meta } from "@web-widget/react";
import { renderMetaToString, mergeMeta } from "@web-widget/react";
import ReactCounter from "./_components/Counter@widget.tsx";
import "./_css/style.css";
// eslint-disable-next-line import/no-unresolved
import icon from "../public/favicon.svg";
import BaseLayout from "./_components/BaseLayout.tsx";

type MetaPageData = {
  allMetadata: Meta;
};

export const meta: Meta = {
  title: "Meta",
  description: "HTML Meta Data Example",
  link: [
    {
      type: "application/json",
      href: "https://google.com/test.json",
    },
  ],
  meta: [
    {
      name: "keywords",
      content: "a, b",
    },
    {
      property: "og:title",
      content: "New Site",
    },
    {
      property: "og:url",
      content: "http://newsblog.org/news/136756249803614",
    },
  ],
};

export const handler: Handlers<MetaPageData> = {
  async GET(ctx) {
    const newMeta = mergeMeta(ctx.meta, {
      title: "😄New title!",
      meta: [
        {
          name: "keywords",
          content: "c, d",
        },
        {
          property: "og:title",
          content: "New Site",
        },
        {
          name: "hello",
          content: "world",
        },
        {
          property: "og:url",
          content: "http://newsblog.org/news/136756249803614",
        },
      ],
    });
    return ctx.render({
      meta: newMeta,
      data: {
        allMetadata: newMeta,
      },
    });
  },
};

function MetaHtmlCode(meta: Meta) {
  // prettier-ignore
  return (<pre>{renderMetaToString(meta).replace(/(\/(\w+)?>)/g, "$1\n")}</pre>)
}

export default function Page(props: RouteComponentProps<MetaPageData>) {
  const {
    data: { allMetadata },
  } = props;
  return (
    <BaseLayout>
      <h1>Meta</h1>
      <h2>JSON:</h2>
      <pre>{JSON.stringify(allMetadata, null, 2)}</pre>
      <h2>HTML:</h2>
      <MetaHtmlCode {...allMetadata} />
      <hr />
      <ReactCounter name="React Counter" start={3} />
      <div>
        <img src={icon} />
      </div>
    </BaseLayout>
  );
}
