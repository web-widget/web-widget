import { defineRouteComponent, defineMeta } from '@web-widget/react';
import ReactCounter from './(components)/Counter@widget';
import VanillaCounter from './(components)/VanillaCounter@widget?as=jsx';
import BaseLayout from './(components)/BaseLayout.tsx';
import VueCounter from './(vue3)/Counter@widget.vue';
import Vue2Counter from '@playgrounds/web-router-vue2/Counter@widget.vue';
import { toReact } from './(vue3)/helpers';
import { toReact as vue2ToReact } from './(vue2)/helpers';

const RVueCounter = toReact(VueCounter);
const RVue2Counter = vue2ToReact(Vue2Counter);

export const meta = defineMeta({
  title: 'Hello, Web Widget',
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Using react and vue together</h1>

      <h2>React component:</h2>
      <ReactCounter count={3} />

      <h2>Vue3 component:</h2>
      <RVueCounter count={3} />

      <h2>Vue2 component:</h2>
      <RVue2Counter count={3} />

      <h2>Vanilla component:</h2>
      <VanillaCounter count={3} />
    </BaseLayout>
  );
});
