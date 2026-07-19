/** @jsxImportSource preact */
import { defineRouteHandler } from '@web-widget/helpers';
import { container } from '@web-widget/preact/adapter';
import '../../(css)/demo-states.css';
import Layout from '../../frameworks/preact/Layout';
import PageHeader from './PageHeader';
import Section from './Section';

const WaitDemo = container(() => import('../../(components)/Wait@widget'));
const VueWaitDemo = container(
  () => import('@playgrounds/web-router-vue3/Wait@widget.vue')
);
const FailDemo = container(() => import('../../(components)/Fail@widget'));
const Pending = <div className="demo-loading">Pending: loading content...</div>;
const ErrorFallback = (
  <div className="demo-error">Error: content failed to load.</div>
);

export const handler = defineRouteHandler({
  async GET(ctx) {
    return ctx.html(undefined, { renderer: { progressive: true } });
  },
});

export default function Page() {
  return (
    <Layout>
      <PageHeader
        title="Preact: Progressive streaming"
        description="Pending UI is sent immediately, then replaced by resolved content or an error message as asynchronous work settles."
      />
      <Section
        title="Multiple pending items are replaced in completion order"
        description="Each loading state appears immediately; results are streamed into their own positions as each request completes.">
        <WaitDemo widget={{ fallback: Pending }} id="React Widget 1" />
        <VueWaitDemo widget={{ fallback: Pending }} id="Vue 3 Widget 2" />
        <WaitDemo widget={{ fallback: Pending }} id="React Widget 3" />
      </Section>
      <Section
        title="Pending content is replaced when rendering fails"
        description="The loading state appears first, then the error message recovers this section.">
        <FailDemo
          widget={{ fallback: { pending: Pending, error: ErrorFallback } }}
          id="preact:error"
        />
      </Section>
    </Layout>
  );
}
