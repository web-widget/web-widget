import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import ReactCounter from '../(components)/Counter@widget.tsx';
import BaseLayout from '../(components)/BaseLayout.tsx';
import VueCounter from '../(components)/Counter@widget.vue';
import { toReact } from '@web-widget/vue';
import shared from '../(components)/shared.module.css';

const RVueCounter = toReact(VueCounter);

export const meta = defineMeta({
  title: 'Widgets - Web Widget',
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <div className={shared.container}>
        <h1 className={shared.pageTitle}>🍀 Widgets</h1>

        <div className={`${shared.highlight} ${shared.info}`}>
          <h2>React and Vue components collaborate on the same page</h2>
          <p>
            One of Web Widget's core features is supporting multiple frontend
            frameworks to coexist seamlessly in the same application. The
            following demo shows how React and Vue components can work together
            on the same page.
          </p>
        </div>

        <div className={shared.mb6}>
          <h3 className={shared.sectionTitle}>Framework Coexistence Demo</h3>
          <div className={`${shared.grid} ${shared.grid2}`}>
            <div className={shared.card}>
              <h4 className={shared.cardTitle}>React Counter</h4>
              <p className={shared.cardDescription}>
                Counter component implemented with React 19 and modern Hooks
              </p>
              <div className={shared.mt3}>
                <ReactCounter count={0} variant="react" />
              </div>
            </div>

            <div className={shared.card}>
              <h4 className={shared.cardTitle}>Vue Counter</h4>
              <p className={shared.cardDescription}>
                Counter component implemented with Vue 3 Composition API
              </p>
              <div className={shared.mt3}>
                <RVueCounter count={0} variant="vue" />
              </div>
            </div>
          </div>

          <div
            className={`${shared.infoPanel} ${shared.success}`}
            style={{ marginTop: '2rem' }}>
            <h4>🎯 Actual Effect</h4>
            <p>
              Notice: The two counters are completely independent components,
              implemented with different frontend frameworks, but they can run
              seamlessly on the same page without conflicts.
            </p>
          </div>
        </div>

        <div className={shared.mb6}>
          <h3 className={shared.sectionTitle}>Technical Features</h3>
          <div className={`${shared.grid} ${shared.grid3}`}>
            <div className={shared.card}>
              <div className={shared.cardIcon}>🔄</div>
              <h4 className={shared.cardTitle}>Auto Conversion</h4>
              <p className={shared.cardDescription}>
                Vue components are automatically converted to React components
                via Vite
              </p>
            </div>
            <div className={shared.card}>
              <div className={shared.cardIcon}>⚡</div>
              <h4 className={shared.cardTitle}>Isomorphic Rendering</h4>
              <p className={shared.cardDescription}>
                Components from both frameworks support server-side rendering
                and client-side hydration
              </p>
            </div>
            <div className={shared.card}>
              <div className={shared.cardIcon}>🔒</div>
              <h4 className={shared.cardTitle}>Type Safe</h4>
              <p className={shared.cardDescription}>
                TypeScript type definitions ensure type safety for
                cross-framework component calls
              </p>
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
});
