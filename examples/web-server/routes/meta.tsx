import type { Handlers, RouteComponentProps, Meta } from "@web-widget/react";
import { renderMetaToString } from "@web-widget/react";
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
    return ctx.render({
      data: {
        allMetadata: ctx.meta,
      },
    });
  },
};

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
      <pre>
        {renderMetaToString(allMetadata).replace(/(\/(\w+)?>)/g, "$1\n")}
      </pre>
      <div>
        <img src={icon} />
      </div>
    </>
  );
}
