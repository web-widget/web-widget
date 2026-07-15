/** @jsxImportSource solid-js */
import { defineMeta } from '@web-widget/helpers';
import { container } from '@web-widget/solid/adapter';
import Layout from './Layout';

const ReactCounter = container(
  () => import('~/routes/frameworks/react/Counter@widget')
);

export const meta = defineMeta({ title: 'Solid Widget embedding' });

export default function Page() {
  return (
    <Layout>
      <header class="ds-page-header">
        <h1>Solid Widget embedding</h1>
        <p class="ds-description">
          A React Widget embedded through the Solid container.
        </p>
      </header>
      <section class="ds-section">
        <h2>React counter</h2>
        <ReactCounter count={3} />
      </section>
    </Layout>
  );
}
