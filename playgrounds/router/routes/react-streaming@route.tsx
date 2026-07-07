import { defineRouteComponent } from '@web-widget/react';
import BaseLayout from './(components)/BaseLayout.js';
import ReactWaitDemo from './(components)/Wait@widget.js';
import VueWaitDemo from '@playgrounds/web-router-vue3/Wait@widget.vue?as=tsx';

const Loading = (
  <div style={{ background: '#f3f3f3', padding: '20px' }}>Loading..</div>
);

export default defineRouteComponent(async function Page() {
  return (
    <BaseLayout>
      <h1>React Route: Streaming</h1>
      <VueWaitDemo fallback={Loading} id="demo:0" />
      <hr />
      <VueWaitDemo fallback={Loading} id="demo:1" />
      <hr />
      <VueWaitDemo fallback={Loading} id="demo:2" />
      <hr />
      <ReactWaitDemo fallback={Loading} id="demo:3" />
      <hr />
      <ReactWaitDemo fallback={Loading} id="demo:4" />
      <hr />
      <ReactWaitDemo fallback={Loading} id="demo:5" />
    </BaseLayout>
  );
});
