import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import BaseLayout from '../(components)/BaseLayout';
import EditButton from '../(components)/EditButton@widget.tsx';
import Echo from './Echo@widget';
import shared from '../(components)/shared.module.css';

export const meta = defineMeta({
  title: 'Server Actions - Web Widget',
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <div className={shared.container}>
        <h1 className={shared.pageTitle}>⚡ Server Actions</h1>

        <div className={`${shared.highlight} ${shared.info}`}>
          <h2>Call server-side functions directly from the client</h2>
          <p>
            Server actions allow you to run server-side functions directly from
            client components, creating a seamless bridge between frontend and
            backend code.
          </p>
        </div>

        <div className={shared.mb6}>
          <h3 className={shared.sectionTitle}>Core Features</h3>
          <div className={`${shared.grid} ${shared.grid3}`}>
            <div className={shared.card}>
              <div className={shared.cardIcon}>🔒</div>
              <h4 className={shared.cardTitle}>Type Safe</h4>
              <p className={shared.cardDescription}>
                TypeScript type checking covers the complete call chain from
                client to server
              </p>
            </div>
            <div className={shared.card}>
              <div className={shared.cardIcon}>🔄</div>
              <h4 className={shared.cardTitle}>Auto Serialization</h4>
              <p className={shared.cardDescription}>
                Automatically handles parameter and return value serialization,
                no manual conversion needed
              </p>
            </div>
            <div className={shared.card}>
              <div className={shared.cardIcon}>📞</div>
              <h4 className={shared.cardTitle}>Direct Call</h4>
              <p className={shared.cardDescription}>
                Call server functions like local functions, no need to write API
                routes
              </p>
            </div>
          </div>
        </div>

        <div className={`${shared.infoPanel} ${shared.success}`}>
          <h3 className={shared.subsectionTitle}>Interactive Demo</h3>
          <p>
            Enter some text below. After clicking "Send to Server", the text
            will be sent to the server-side function for processing, and return
            a response containing timestamp and server information.
          </p>
          <div style={{ marginTop: '1.5rem' }}>
            <Echo />
          </div>
        </div>

        <div className={shared.comparison}>
          <h3 className={`${shared.subsectionTitle} ${shared.textCenter}`}>
            Comparison with Traditional API
          </h3>
          <div className={shared.comparisonGrid}>
            <div className={shared.comparisonItem}>
              <h4
                className={shared.cardTitle}
                style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>
                Traditional REST API
              </h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>❌ Need to create separate API routes</li>
                <li>⚙️ Manual request/response serialization</li>
                <li>🔄 Client and server types easily get out of sync</li>
                <li>🛠️ Need additional error handling and state management</li>
                <li>🔗 URL paths and parameters prone to errors</li>
              </ul>
            </div>
            <div className={shared.comparisonItem}>
              <h4
                className={shared.cardTitle}
                style={{ color: 'var(--color-success)', marginBottom: '1rem' }}>
                Web Widget Server Actions
              </h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>✅ Function is API, no additional routes needed</li>
                <li>⚡ Auto serialization, no manual conversion</li>
                <li>🔒 Complete TypeScript type safety</li>
                <li>🎯 Built-in loading and error states</li>
                <li>📞 Call like local functions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Edit button - only shown in development */}
      <EditButton currentFileUrl={import.meta.url} />
    </BaseLayout>
  );
});
