import './(css)/error.css';
import { defineRouteFallbackComponent } from '@web-widget/helpers';
import { container } from '@web-widget/react/adapter';

const RVueCounter = container(
  () =>
    import('@playgrounds/web-router-vue3/frameworks/vue3/Counter@widget.vue')
);

const Page500 = defineRouteFallbackComponent(function Page500(ctx) {
  return (
    <main>
      <div className="error-card">
        <p className="error-code error-code-500">500</p>
        <p className="error-title">Internal Server Error</p>
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

export { Page500 as fallback };
export default Page500;
