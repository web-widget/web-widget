import { defineRouteComponent, defineRouteHandler } from '@web-widget/helpers';
import { container } from '@web-widget/react/adapter';
import '../../(css)/demo-states.css';
import BaseLayout from '../../(components)/BaseLayout.js';
import { PageHeader, Section } from '../../(components)/ui';
import ReactFailDemo from '../../(components)/Fail@widget.js';
import ReactWaitDemo from '../../(components)/Wait@widget.js';

const VueWaitDemo = container(
  () => import('@playgrounds/web-router-vue3/Wait@widget.vue')
);

const Pending = <div className="demo-loading">Pending: loading content...</div>;
const ErrorFallback = (
  <div className="demo-error">Error: content failed to load.</div>
);

export const handler = defineRouteHandler({
  async GET(ctx) {
    return ctx.html(undefined, { renderer: { progressive: true } });
  },
});

export default defineRouteComponent(async function Page() {
  return (
    <BaseLayout>
      <PageHeader
        title="React: Progressive streaming"
        description="Pending UI is sent immediately, then replaced by resolved content or an error message as asynchronous work settles."
      />
      <Section
        title="Multiple pending items are replaced in completion order"
        description="Each loading state appears immediately; results are streamed into their own positions as each request completes.">
        <ReactWaitDemo widget={{ fallback: Pending }} id="React Widget 1" />
        <VueWaitDemo widget={{ fallback: Pending }} id="Vue 3 Widget 2" />
        <ReactWaitDemo widget={{ fallback: Pending }} id="React Widget 3" />
      </Section>
      <Section
        title="Pending content is replaced when rendering fails"
        description="The loading state appears first, then the error message recovers this section.">
        <ReactFailDemo
          widget={{ fallback: { pending: Pending, error: ErrorFallback } }}
          id="react:error"
        />
      </Section>
    </BaseLayout>
  );
});
