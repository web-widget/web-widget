import {
  defineRouteComponent,
  defineMeta,
  defineRouteHandler,
} from '@web-widget/helpers';
import { marketingABTestManualApproach } from '#config/flags';
import Layout from '../(components)/Layout.tsx';
import FlagControls from '../(components)/FlagControls@widget.tsx';
import styles from './index.module.css';

export const meta = defineMeta({
  title: 'Marketing Pages Manual Approach - Flags SDK',
});

interface MarketingManualData {
  flagValue: boolean;
}

export const handler = defineRouteHandler<MarketingManualData>({
  async GET({ request, html }) {
    const flagValue = await marketingABTestManualApproach(request);

    return html({ flagValue });
  },
});

export default defineRouteComponent<MarketingManualData>(
  function MarketingManualPage({ data }) {
    const { flagValue } = data;

    return (
      <Layout>
        <div className={styles.container}>
          <h1 className={styles.title}>Marketing Pages (Manual Approach)</h1>
          <p className={styles.description}>
            This example demonstrates a simple but not scalable approach to
            feature flags on content-driven pages. The flag value is checked
            manually in each route.
          </p>

          {flagValue ? (
            <div className={styles.flagResult + ' ' + styles.flagTrue}>
              <div className={styles.flagMessage}>
                The feature flag{' '}
                <span className={styles.flagName}>
                  marketingABTestManualApproach
                </span>{' '}
                evaluated to <span className={styles.flagValue}>true</span>.
              </div>
              <div className={styles.variantContent}>
                <h3>🎉 Variant A - Special Offer!</h3>
                <p>Get 50% off your first purchase with code SAVE50!</p>
              </div>
            </div>
          ) : (
            <div className={styles.flagResult + ' ' + styles.flagFalse}>
              <div className={styles.flagMessage}>
                The feature flag{' '}
                <span className={styles.flagName}>
                  marketingABTestManualApproach
                </span>{' '}
                evaluated to <span className={styles.flagValue}>false</span>.
              </div>
              <div className={styles.variantContent}>
                <h3>📢 Variant B - Standard Message</h3>
                <p>Welcome to our store! Browse our latest products.</p>
              </div>
            </div>
          )}

          <FlagControls
            flagName="marketingABTestManualApproach"
            cookieName="marketingManual"
            trueLabel="Show Variant A"
            falseLabel="Show Variant B"
            clearLabel="Reset"
          />
        </div>
      </Layout>
    );
  }
);
