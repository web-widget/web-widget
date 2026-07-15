/** @jsxImportSource preact */
import { defineMeta } from '@web-widget/helpers';
import { container } from '@web-widget/preact/adapter';
import Layout from './Layout';

const VueCounter = container(
  () => import('@playgrounds/web-router-vue3/Counter@widget.vue')
);

export const meta = defineMeta({ title: 'Preact Widget embedding' });

export default function Page() {
  return (
    <Layout>
      <header class="ds-page-header">
        <h1>Preact Widget embedding</h1>
        <p class="ds-description">
          A Vue 3 Widget embedded through the Preact container.
        </p>
      </header>
      <section class="ds-section">
        <h2>Vue 3 counter</h2>
        <VueCounter count={3} />
      </section>
    </Layout>
  );
}
