import './(css)/error.css';
import { defineRouteFallbackComponent } from '@web-widget/helpers';
import { widget } from '@web-widget/react/adapter';

const RVueCounter = widget(
  () => import('~/routes/(vue3)/(components)/Vue3Counter@widget.vue')
);

const Page404 = defineRouteFallbackComponent(function Page404(ctx) {
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

export { Page404 as fallback };
export default Page404;
