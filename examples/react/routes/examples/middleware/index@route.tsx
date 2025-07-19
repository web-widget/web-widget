import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import BaseLayout from '../(components)/BaseLayout.tsx';
import shared from '../(components)/shared.module.css';

export const meta = defineMeta({
  title: 'Middleware - Web Widget',
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <div className={shared.container}>
        <h1 className={shared.pageTitle}>🧅 Middleware</h1>

        <div className={`${shared.highlight} ${shared.info}`}>
          <h2>Web Widget Middleware System</h2>
          <p>
            Middleware is a core component of Web Widget's routing system,
            allowing you to insert custom logic into the request processing
            pipeline. This page dynamically modifies page metadata through
            middleware, demonstrating the powerful capabilities of middleware.
          </p>
        </div>

        <div className={shared.mb6}>
          <h3 className={shared.sectionTitle}>Response Headers Demo</h3>
          <div className={`${shared.infoPanel} ${shared.warning}`}>
            <h4>⚙️ Dynamically Modified Request Headers</h4>
            <p>
              This page's middleware also adds custom response headers. You can
              observe through browser developer tools:
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
              <li>
                <strong>Network panel</strong>: Check the{' '}
                <code>X-Powered-By</code> demo header
              </li>
            </ul>
          </div>
        </div>

        <div className={shared.mb6}>
          <h3 className={shared.sectionTitle}>Page Metadata Operations Demo</h3>
          <div className={`${shared.infoPanel} ${shared.success}`}>
            <h4>🔧 Dynamically Modified Page Metadata</h4>
            <p>
              The current page's <code>&lt;meta&gt;</code> tags and scripts are
              all dynamically modified through middleware:
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
              <li>
                <strong>Description</strong>: Dynamically added SEO-friendly
                page description
              </li>
              <li>
                <strong>Keywords</strong>: Injected keywords like "middleware,
                web widget, demo"
              </li>
              <li>
                <strong>Dynamic Script</strong>: Injected a JavaScript code
                snippet (check browser console)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
});
