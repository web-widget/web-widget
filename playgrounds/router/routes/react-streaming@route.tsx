import { defineRouteComponent } from '@web-widget/helpers';
import './(css)/demo-states.css';
import BaseLayout from './(components)/BaseLayout.js';
import { PageHeader } from './(components)/ui';
import ReactWaitDemo from './(components)/Wait@widget.js';
import VueWaitDemo from '@playgrounds/web-router-vue3/Wait@widget.vue';
import { asReactWidget } from '@playgrounds/web-router-vue3/helpers';

const RVueWaitDemo = asReactWidget(VueWaitDemo);

const Loading = <div className="demo-loading">Loading..</div>;

export default defineRouteComponent(async function Page() {
  return (
    <BaseLayout>
      <PageHeader
        title="React: Streaming"
        description="Stream React content progressively with Suspense — slow sections render as they become ready without blocking the rest of the page."
      />
      <RVueWaitDemo widget={{ fallback: Loading }} id="demo:0" />
      <RVueWaitDemo widget={{ fallback: Loading }} id="demo:1" />
      <RVueWaitDemo widget={{ fallback: Loading }} id="demo:2" />
      <ReactWaitDemo widget={{ fallback: Loading }} id="demo:3" />
      <ReactWaitDemo widget={{ fallback: Loading }} id="demo:4" />
      <ReactWaitDemo widget={{ fallback: Loading }} id="demo:5" />
    </BaseLayout>
  );
});
