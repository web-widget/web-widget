import type { Handlers, RouteComponentProps, Meta } from "@web-widget/react";
import { renderMetaToString, mergeMeta } from "@web-widget/react";
export { render } from "@web-widget/react";

import "../css/style.css";
import icon from "../public/favicon.svg";

type MetaPageData = {
  allMetadata: Meta;
};

export const meta: Meta = {
  title: "Meta",
  description: "HTML Meta Data Example",
};

export const handler: Handlers<MetaPageData> = {
  async GET(ctx) {
    const newMeta = mergeMeta(ctx.meta, {
      title: "😄New title!",
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
    <>
      <h1>Meta</h1>
      <h2>JSON:</h2>
      <pre>{JSON.stringify(allMetadata, null, 2)}</pre>
      <h2>HTML:</h2>
      <MetaHtmlCode {...allMetadata} />
      <div>
        <img src={icon} />
      </div>
    </>
  );
}
