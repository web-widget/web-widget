import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import BaseLayout from '../(components)/BaseLayout.tsx';
import EditButton from '../(components)/EditButton@widget.tsx';
import shared from '../(components)/shared.module.css';

interface Params {
  name: string;
}

export const meta = defineMeta({
  title: 'Dynamic Routing - Web Widget',
});

export default defineRouteComponent<null, Params>(function Page({ params }) {
  const { name } = params;
  return (
    <BaseLayout>
      <div className={shared.container}>
        <h1 className={shared.pageTitle}>🎯 Dynamic Routing</h1>

        <div className={`${shared.highlight} ${shared.info}`}>
          <h2>File-system-based dynamic route handling</h2>
          <p>
            Web Widget uses file system routing with support for dynamic
            parameter capture.
          </p>
        </div>

        <div className={`${shared.infoPanel} ${shared.success}`}>
          <h3 className={shared.subsectionTitle}>👋 Greeting</h3>
          <p style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
            Hello, <strong>{name}</strong>!
          </p>
          <p className={shared.textMuted} style={{ fontSize: '0.875rem' }}>
            The dynamic parameter <code>[name]</code> from the current URL has
            the value:
            <code>{name}</code>
          </p>
        </div>

        <div className={shared.mb6}>
          <h3 className={shared.sectionTitle}>Try Other Examples</h3>
          <div className={`${shared.grid} ${shared.grid3}`}>
            <a
              href="/examples/params/react"
              className={`${shared.card} ${shared.cardHover}`}
              style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className={shared.textCenter}>
                <div className={shared.cardIcon}>⚛️</div>
                <div className={shared.cardTitle}>React</div>
              </div>
            </a>
            <a
              href="/examples/params/vue"
              className={`${shared.card} ${shared.cardHover}`}
              style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className={shared.textCenter}>
                <div className={shared.cardIcon}>💚</div>
                <div className={shared.cardTitle}>Vue</div>
              </div>
            </a>
            <a
              href="/examples/params/developer"
              className={`${shared.card} ${shared.cardHover}`}
              style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className={shared.textCenter}>
                <div className={shared.cardIcon}>👨‍💻</div>
                <div className={shared.cardTitle}>Developer</div>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Edit button - only shown in development */}
      <EditButton currentFileUrl={import.meta.url} />
    </BaseLayout>
  );
});
