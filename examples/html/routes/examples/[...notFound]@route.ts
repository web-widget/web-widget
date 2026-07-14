import { html } from '@web-widget/html';
import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import { baseLayout } from './(components)/baseLayout.html';
import shared from './(components)/shared.module.css';
import styles from './notFound.module.css';

export const meta = defineMeta({
  title: '404 - Not Found',
});

export default defineRouteComponent(function Page() {
  return baseLayout(html`
    <div class="${shared.container}">
      <div class="${styles.errorContainer}">
        <div class="${styles.errorIcon}">🔍</div>
        <h1 class="${styles.errorTitle}">Not Found</h1>
        <p class="${styles.errorSubtitle}">
          Sorry, the page you are looking for does not exist or has been moved.
        </p>
      </div>
    </div>
  `);
});
