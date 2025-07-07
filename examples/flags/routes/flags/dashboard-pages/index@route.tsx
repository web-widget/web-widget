import {
  defineRouteComponent,
  defineMeta,
  defineRouteHandler,
} from '@web-widget/helpers';
import { showNewDashboard } from '#config/flags';
import Layout from '../(components)/Layout.tsx';
import FlagControls from '../(components)/FlagControls@widget.tsx';
import styles from './index.module.css';

export const meta = defineMeta({
  title: 'Dashboard Pages - Flags SDK',
});

interface DashboardData {
  flagValue: boolean;
}

export const handler = defineRouteHandler<DashboardData>({
  async GET({ request, render }) {
    const flagValue = await showNewDashboard(request);

    return render({
      data: { flagValue },
    });
  },
});

export default defineRouteComponent<DashboardData>(function DashboardPage({
  data,
}) {
  const { flagValue } = data;

  return (
    <Layout>
      <div className={styles.container}>
        <h1 className={styles.title}>Dashboard Pages</h1>
        <p className={styles.description}>
          This example demonstrates using feature flags on user-controlled
          pages.
        </p>

        {flagValue ? (
          <div className={styles.flagResult + ' ' + styles.flagTrue}>
            <div className={styles.flagMessage}>
              The feature flag{' '}
              <span className={styles.flagName}>showNewDashboard</span>{' '}
              evaluated to <span className={styles.flagValue}>true</span>.
            </div>
          </div>
        ) : (
          <div className={styles.flagResult + ' ' + styles.flagFalse}>
            <div className={styles.flagMessage}>
              The feature flag{' '}
              <span className={styles.flagName}>showNewDashboard</span>{' '}
              evaluated to <span className={styles.flagValue}>false</span>.
            </div>
          </div>
        )}

        <FlagControls
          flagName="showNewDashboard"
          cookieName="showNewDashboard"
        />
      </div>
    </Layout>
  );
});
