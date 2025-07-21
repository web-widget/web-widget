import { defineMeta, defineRouteComponent } from '@web-widget/helpers';
import BaseLayout from './(components)/BaseLayout.tsx';
import shared from './(components)/shared.module.css';
import styles from './notFound.module.css';

export const meta = defineMeta({
  title: '404 - Not Found',
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <div className={shared.container}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>🔍</div>
          <h1 className={styles.errorTitle}>Not Found</h1>
          <p className={styles.errorSubtitle}>
            Sorry, the page you are looking for does not exist or has been
            moved.
          </p>
        </div>
      </div>
    </BaseLayout>
  );
});
