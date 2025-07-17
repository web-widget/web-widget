import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import BaseLayout from '../(components)/BaseLayout.tsx';
import shared from '../(components)/shared.module.css';
import styles from './index.module.css';

export const meta = defineMeta({
  title: 'Static Page - Web Widget',
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <div className={shared.container}>
        <h1 className={shared.pageTitle}>📄 Static Page</h1>

        <div className={`${shared.highlight} ${shared.info}`}>
          <h2>Pure static HTML, no client-side JavaScript required</h2>
          <p>
            This page is pure static HTML with no client-side interaction
            required. This means we don't need to load any JavaScript code.
          </p>
        </div>

        <div className={shared.mb6}>
          <h3 className={shared.subsectionTitle}>Features & Benefits</h3>
          <ul className={shared.featureList}>
            <li>
              <strong>Fast Loading</strong> - No need to wait for JavaScript
              download and execution
            </li>
            <li>
              <strong>SEO Friendly</strong> - Search engines can directly index
              complete content
            </li>
            <li>
              <strong>Low Resource Usage</strong> - Reduces client-side
              computation and battery consumption
            </li>
            <li>
              <strong>High Availability</strong> - Content displays normally
              even when JavaScript is disabled
            </li>
          </ul>
        </div>

        <div className={styles.demoList}>
          <h3 className={shared.subsectionTitle}>Verification Methods</h3>
          <p>
            You can verify this is a pure static page through the following
            methods:
          </p>
          <ol>
            <li>
              Right-click to view page source - content is completely rendered
              in HTML
            </li>
            <li>
              Open Developer Tools Network panel and refresh the page - no
              additional JavaScript requests
            </li>
            <li>
              Disable JavaScript and refresh the page - content still displays
              completely
            </li>
          </ol>
        </div>
      </div>
    </BaseLayout>
  );
});
