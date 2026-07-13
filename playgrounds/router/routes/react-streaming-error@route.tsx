import { defineRouteComponent } from '@web-widget/helpers';
import './(css)/demo-states.css';
import BaseLayout from './(components)/BaseLayout.js';
import { PageHeader, Section } from './(components)/ui';
import ReactWaitDemo from './(components)/Wait@widget.js';
import ReactFailDemo from './(components)/Fail@widget.js';

const Loading = <div className="demo-loading">Loading..</div>;

const Error = (
  <div className="demo-error">Widget failed to render (error recovered)</div>
);

export default defineRouteComponent(async function Page() {
  return (
    <BaseLayout>
      <PageHeader
        title="React: Streaming error"
        description="This page demonstrates streaming SSR error recovery. The failing widget is wrapped in an ErrorBoundary so the rest of the page stays functional."
      />

      <Section title="Normal widget (succeeds)">
        <ReactWaitDemo widget={{ fallback: Loading }} id="ok:0" />
      </Section>

      <Section title="Failing widget with differentiated fallback (loading vs error)">
        <ReactFailDemo
          widget={{ fallback: { pending: Loading, error: Error } }}
          id="fail:0"
        />
      </Section>

      <Section title="Another normal widget after the failure">
        <ReactWaitDemo widget={{ fallback: Loading }} id="ok:1" />
      </Section>
    </BaseLayout>
  );
});
