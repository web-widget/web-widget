import { html } from '@web-widget/html';
import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import { baseLayout } from '../(components)/baseLayout.html';
import shared from '../(components)/shared.module.css';
import styles from './index.module.css';

export const meta = defineMeta({
  title: 'Static Page - Web Widget',
});

export default defineRouteComponent(function Page() {
  return baseLayout(html`
    <div class="${shared.container}">
      <h1 class="${shared.pageTitle}">📄 Static Page</h1>

      <div class="${shared.highlight} ${shared.info}">
        <h2>Pure static HTML, no client-side JavaScript required</h2>
        <p>
          This page is rendered using HTML tagged templates. The content is
          generated on the server as pure HTML with no client-side JavaScript
          required.
        </p>
      </div>

      <div class="${shared.mb6}">
        <h3 class="${shared.subsectionTitle}">Features &amp; Benefits</h3>
        <ul class="${shared.featureList}">
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
            <strong>High Availability</strong> - Content displays normally even
            when JavaScript is disabled
          </li>
        </ul>
      </div>

      <div class="${styles.demoList}">
        <h3 class="${shared.subsectionTitle}">HTML Template Syntax</h3>
        <p>
          The page is built using the <code>html</code> tagged template literal
          from <code>@web-widget/html</code>. All interpolated values are
          automatically escaped to prevent XSS attacks.
        </p>
      </div>

      <div class="${shared.mb6}">
        <h3 class="${shared.sectionTitle}">Verification Methods</h3>
        <p>
          You can verify this is a pure static page through the following
          methods:
        </p>
        <ol>
          <li>
            Right-click to view page source - content is completely rendered in
            HTML
          </li>
          <li>
            Open Developer Tools Network panel and refresh the page - no
            additional JavaScript requests for page rendering
          </li>
          <li>
            Disable JavaScript and refresh the page - content still displays
            completely
          </li>
        </ol>
      </div>
    </div>
  `);
});
