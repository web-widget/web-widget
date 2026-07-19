/** @jsxImportSource solid-js */
import { defineRouteHandler } from '@web-widget/helpers';
import { container } from '@web-widget/solid/adapter';
import '../../(css)/demo-states.css';
import Layout from '../../frameworks/solid/Layout';

const WaitDemo = container(() => import('../../(components)/Wait@widget'));
const VueWaitDemo = container(
  () => import('@playgrounds/web-router-vue3/Wait@widget.vue')
);
const FailDemo = container(() => import('../../(components)/Fail@widget'));
const Pending = <div class="demo-loading">Pending: loading content...</div>;
const ErrorFallback = (
  <div class="demo-error">Error: content failed to load.</div>
);

export const handler = defineRouteHandler({
  async GET(ctx) {
    return ctx.html(undefined, { renderer: { progressive: true } });
  },
});

export default function Page() {
  return (
    <Layout>
      <header class="ds-page-header">
        <h1>Solid: Progressive streaming</h1>
        <p class="ds-description">
          Pending UI is sent immediately, then replaced by resolved content or
          an error message as asynchronous work settles.
        </p>
      </header>
      <section class="ds-section">
        <h2>Multiple pending items are replaced in completion order</h2>
        <p class="ds-description">
          Each loading state appears immediately; results are streamed into
          their own positions as each request completes.
        </p>
        <WaitDemo widget={{ fallback: Pending }} id="React Widget 1" />
        <VueWaitDemo widget={{ fallback: Pending }} id="Vue 3 Widget 2" />
        <WaitDemo widget={{ fallback: Pending }} id="React Widget 3" />
      </section>
      <section class="ds-section">
        <h2>Pending content is replaced when rendering fails</h2>
        <p class="ds-description">
          The loading state appears first, then the error message recovers this
          section.
        </p>
        <FailDemo
          widget={{ fallback: { pending: Pending, error: ErrorFallback } }}
          id="solid:error"
        />
      </section>
    </Layout>
  );
}
