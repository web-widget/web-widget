import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import ReactCounter from './(components)/Counter@widget.tsx';
import BaseLayout from './(components)/BaseLayout.tsx';
import EditButton from './(components)/EditButton@widget.tsx';
import styles from './index.module.css';
import shared from './(components)/shared.module.css';

export const meta = defineMeta({
  title: 'Web Widget',
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <div className={shared.container}>
        {/* Hero Section */}
        <div className={styles.hero}>
          <h1 className={shared.pageTitle}>
            <span>Simple & Powerful</span>
            <br></br>
            <span>Tech-stack-agnostic</span> <span>Web Framework</span>
          </h1>
          <p className={styles.subtitle}>
            Built on web standards, cross-platform, integrates with different
            frontend UI frameworks
          </p>
        </div>

        {/* Demo Section */}
        <div className={styles.demoSection}>
          <div className={styles.heroDemo}>
            <p className={styles.demoIntro}>✨ Widget in the page</p>
            <ReactCounter count={0} />
            <p className={styles.demoHint}>
              This is an interactive widget demo, which can use any tech stack
            </p>
          </div>
        </div>

        {/* Features Section */}
        <div className={shared.mb6}>
          <h2 className={shared.sectionTitle}>Basic Examples</h2>

          <div className={`${shared.grid} ${shared.grid3}`}>
            <a
              className={`${shared.card} ${shared.cardHover} ${shared.linkCard}`}
              href="/examples/static">
              <div className={shared.textCenter}>
                <div className={shared.cardIcon}>📄</div>
                <h3 className={shared.cardTitle}>Static Page</h3>
                <p className={shared.cardDescription}>
                  Pure static HTML page, no client-side JavaScript required
                </p>
              </div>
            </a>

            <a
              className={`${shared.card} ${shared.cardHover} ${shared.linkCard}`}
              href="/examples/params/web-widget">
              <div className={shared.textCenter}>
                <div className={shared.cardIcon}>🎯</div>
                <h3 className={shared.cardTitle}>Dynamic Routing</h3>
                <p className={shared.cardDescription}>
                  File-system-based dynamic route handling
                </p>
              </div>
            </a>

            <a
              className={`${shared.card} ${shared.cardHover} ${shared.linkCard}`}
              href="/examples/fetch">
              <div className={shared.textCenter}>
                <div className={shared.cardIcon}>🔄</div>
                <h3 className={shared.cardTitle}>Data Fetching</h3>
                <p className={shared.cardDescription}>
                  Fetch data on the server and render as static HTML
                </p>
              </div>
            </a>

            <a
              className={`${shared.card} ${shared.cardHover} ${shared.linkCard}`}
              href="/examples/action">
              <div className={shared.textCenter}>
                <div className={shared.cardIcon}>⚡</div>
                <h3 className={shared.cardTitle}>Server Actions</h3>
                <p className={shared.cardDescription}>
                  Call server-side functions directly from the client
                </p>
              </div>
            </a>

            <a
              className={`${shared.card} ${shared.cardHover} ${shared.linkCard}`}
              href="/examples/frameworks">
              <div className={shared.textCenter}>
                <div className={shared.cardIcon}>🍀</div>
                <h3 className={shared.cardTitle}>Widgets</h3>
                <p className={shared.cardDescription}>
                  React and Vue components work seamlessly on the same page
                </p>
              </div>
            </a>

            <a
              className={`${shared.card} ${shared.cardHover} ${shared.linkCard}`}
              href="/examples/middleware">
              <div className={shared.textCenter}>
                <div className={shared.cardIcon}>🧅</div>
                <h3 className={shared.cardTitle}>Middleware</h3>
                <p className={shared.cardDescription}>
                  Control requests and responses, and modify page metadata
                </p>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* 编辑按钮 - 只在开发环境显示 */}
      <EditButton currentFileUrl={import.meta.url} />
    </BaseLayout>
  );
});
