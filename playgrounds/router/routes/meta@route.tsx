import type { Meta } from '@web-widget/helpers';
import {
  defineMeta,
  defineRouteComponent,
  defineRouteHandler,
  mergeMeta,
  renderMetaToString,
} from '@web-widget/helpers';
import icon from '../public/favicon.svg';
import BaseLayout from './(components)/BaseLayout.tsx';
import { PageHeader, Section, CodeBlock } from './(components)/ui';
import ReactCounter from './(components)/Counter@widget';
import './(css)/style.css';

type MetaPageData = {
  allMetadata: Meta;
};

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
    return ctx.html(
      {
        allMetadata: newMeta,
      },
      {
        meta: newMeta,
      }
    );
  },
});

function MetaHtmlCode(meta: Meta) {
  // prettier-ignore
  return (<CodeBlock>{renderMetaToString(meta).replace(/(\/(\w+)?>)/g, "$1\n")}</CodeBlock>)
}

export default defineRouteComponent<MetaPageData>(function Page(props) {
  const {
    data: { allMetadata },
  } = props;
  return (
    <BaseLayout>
      <PageHeader
        title="Meta"
        description="Set document head metadata - such as title and description - per route. Check the page source to see the meta tags."
      />
      <Section title="JSON">
        <CodeBlock>{JSON.stringify(allMetadata, null, 2)}</CodeBlock>
      </Section>
      <Section title="HTML">
        <MetaHtmlCode {...allMetadata} />
      </Section>
      <ReactCounter count={3} />
      <div>
        <img src={icon} />
      </div>
    </BaseLayout>
  );
});
