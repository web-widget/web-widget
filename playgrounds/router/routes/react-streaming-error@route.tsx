import { defineRouteComponent } from '@web-widget/helpers';
import BaseLayout from './(components)/BaseLayout.js';
import ReactWaitDemo from './(components)/Wait@widget.js';
import ReactFailDemo from './(components)/Fail@widget.js';

const Loading = (
  <div style={{ background: '#f3f3f3', padding: '20px' }}>Loading..</div>
);

const ErrorUI = (
  <div
    style={{
      background: '#ffe0e0',
      color: '#b71c1c',
      padding: '20px',
      border: '1px solid #ef9a9a',
    }}>
    Widget failed to render (error recovered)
  </div>
);

export default defineRouteComponent(async function Page() {
  return (
    <BaseLayout>
      <h1>React Route: Streaming Error Recovery</h1>
      <p>
        This page demonstrates streaming SSR error recovery. The failing widget
        is wrapped in an ErrorBoundary, so errors are contained and the page
        remains functional.
      </p>

      <h2>Normal widget (succeeds)</h2>
      <ReactWaitDemo widget={{ fallback: Loading }} id="ok:0" />

      <h2>Failing widget with differentiated fallback (loading vs error)</h2>
      <ReactFailDemo
        widget={{ fallback: { loading: Loading, error: ErrorUI } }}
        id="fail:0"
      />

      <h2>Another normal widget after the failure</h2>
      <ReactWaitDemo widget={{ fallback: Loading }} id="ok:1" />
    </BaseLayout>
  );
});
