import './(css)/error.css';
import { defineRouteFallbackComponent } from '@web-widget/helpers';
import VueCounter from '@playgrounds/web-router-vue3/Counter@widget.vue';
import { asReactWidget } from '@playgrounds/web-router-vue3/helpers';

const RVueCounter = asReactWidget(VueCounter);

export const fallback = defineRouteFallbackComponent(function Page404(ctx) {
  return (
    <main>
      <div className="error-card">
        <p className="error-code error-code-404">404</p>
        <p className="error-title">Page Not Found</p>
        {ctx.message && <pre className="error-message">{ctx.message}</pre>}
        <RVueCounter count={3} />
        <p style={{ marginTop: '24px' }}>
          <a className="error-home" href="/">
            Back to Home
          </a>
        </p>
      </div>
    </main>
  );
});
