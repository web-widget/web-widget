import type { Meta } from '@web-widget/react';
import {
  defineMeta,
  defineRouteComponent,
  defineRouteHandler,
  mergeMeta,
  renderMetaToString,
} from '@web-widget/react';
import icon from '../public/favicon.svg';
import BaseLayout from './(components)/BaseLayout.tsx';
import ReactCounter from './(components)/Counter@widget';
import './(css)/style.css';

interface MetaPageData {
  allMetadata: Meta;
}

export const meta = defineMeta({
  title: 'Meta',
  description: 'HTML Meta Data Example',
  link: [
    {
      type: 'application/json',
      href: 'https://google.com/test.json',
    },
  ],
  meta: [
    {
      name: 'keywords',
      content: 'a, b',
    },
    {
      property: 'og:title',
      content: 'New Site',
    },
    {
      property: 'og:url',
      content: 'http://newsblog.org/news/136756249803614',
    },
  ],
});

export const handler = defineRouteHandler<MetaPageData>({
  async GET(ctx) {
    const newMeta = mergeMeta(ctx.meta, {
      title: '😄New title!',
      meta: [
        {
          name: 'keywords',
          content: 'c, d',
        },
        {
          property: 'og:title',
          content: 'New Site',
        },
        {
          name: 'hello',
          content: 'world',
        },
        {
          property: 'og:url',
          content: 'http://newsblog.org/news/136756249803614',
        },
      ],
    });
    const data = {
      allMetadata: newMeta,
    };
    return ctx.render(data, {
      meta: newMeta,
    });
  },
});

function MetaHtmlCode(meta: Meta) {
  // prettier-ignore
  return (<pre>{renderMetaToString(meta).replace(/(\/(\w+)?>)/g, "$1\n")}</pre>)
}

export default defineRouteComponent<MetaPageData>(function Page(props) {
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
});
