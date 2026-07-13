import { defineRouteComponent } from '@web-widget/helpers';
import './(css)/demo-states.css';
import BaseLayout from './(components)/BaseLayout.js';
import ReactWaitDemo from './(components)/Wait@widget.js';
import ReactFailDemo from './(components)/Fail@widget.js';

const Loading = <div className="demo-loading">Loading..</div>;

const Error = (
  <div className="demo-error">Widget failed to render (error recovered)</div>
);

export default defineRouteComponent(async function Page() {
  return (
    <BaseLayout>
      <h1>React: Streaming error</h1>
      <p>
        This page demonstrates streaming SSR error recovery. The failing widget
        is wrapped in an ErrorBoundary so the rest of the page stays functional.
      </p>

      <h2>Normal widget (succeeds)</h2>
      <ReactWaitDemo widget={{ fallback: Loading }} id="ok:0" />

      <h2>Failing widget with differentiated fallback (loading vs error)</h2>
      <ReactFailDemo
        widget={{ fallback: { pending: Loading, error: Error } }}
        id="fail:0"
      />

      <h2>Another normal widget after the failure</h2>
      <ReactWaitDemo widget={{ fallback: Loading }} id="ok:1" />
    </BaseLayout>
  );
});
