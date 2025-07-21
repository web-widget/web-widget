import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import Layout from './(components)/Layout.tsx';
import styles from './index.module.css';

export const meta = defineMeta({
  title: 'Flags SDK Examples - Web Router',
});

export default defineRouteComponent(function FlagsIndexPage() {
  return (
    <Layout>
      <div className={styles.container}>
        <h1 className={styles.title}>Flags SDK Examples</h1>

        <p className={styles.description}>
          This page contains example snippets for the Flags SDK using Web
          Router.
        </p>

        <p className={styles.links}>
          See{' '}
          <a
            href="https://flags-sdk.dev"
            target="_blank"
            rel="noopener noreferrer">
            flags-sdk.dev
          </a>{' '}
          for the full documentation, or{' '}
          <a
            href="https://github.com/vercel/flags/tree/main/examples/web-router-example"
            target="_blank"
            rel="noopener noreferrer">
            GitHub
          </a>{' '}
          for the source code.
        </p>

        <div className={styles.examples}>
          <a className={styles.card} href="/flags/dashboard-pages">
            <div className={styles.cardContent}>
              <div className={styles.cardTitle}>Dashboard Pages</div>
              <div className={styles.cardDescription}>
                Using feature flags on user-controlled pages
              </div>
            </div>
          </a>

          <a
            className={styles.card}
            href="/flags/marketing-pages-manual-approach">
            <div className={styles.cardContent}>
              <div className={styles.cardTitle}>
                Marketing Pages (manual approach)
              </div>
              <div className={styles.cardDescription}>
                Simple but not scalable approach to feature flags on
                content-driven pages
              </div>
            </div>
          </a>

          <a className={styles.card} href="/flags/marketing-pages">
            <div className={styles.cardContent}>
              <div className={styles.cardTitle}>Marketing Pages</div>
              <div className={styles.cardDescription}>
                Using feature flags on content-driven pages with precomputed
                routes
              </div>
            </div>
          </a>
        </div>
      </div>
    </Layout>
  );
});
