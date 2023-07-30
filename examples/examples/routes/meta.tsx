import type { Handlers, RouteComponentProps, Meta } from "@web-widget/react";
import { renderMetaToString, mergeMeta } from "@web-widget/react";
import ReactCounter from "../widgets/Counter.tsx";
import "../css/style.css";
import icon from "../public/favicon.svg";
import BaseLayout from "../components/BaseLayout";

export { render } from "@web-widget/react";

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
    <BaseLayout>
      <h1>Meta</h1>
      <h2>JSON:</h2>
      <pre>{JSON.stringify(allMetadata, null, 2)}</pre>
      <h2>HTML:</h2>
      <MetaHtmlCode {...allMetadata} />
      <hr />
      <ReactCounter client name="React Counter" start={3} />
      <div>
        <img src={icon} />
      </div>
    </BaseLayout>
  );
}
