import {
  defineMeta,
  defineRouteComponent,
  defineRouteHandler,
} from '@web-widget/helpers';
import type { HelloData } from '../api/hello@route.ts';
import BaseLayout from '../(components)/BaseLayout.tsx';
import EditButton from '../(components)/EditButton@widget.tsx';
import shared from '../(components)/shared.module.css';

export const meta = defineMeta({
  title: 'Data Fetching - Web Widget',
});

export const handler = defineRouteHandler<HelloData>({
  async GET({ request, html }) {
    const url = new URL(request.url);
    const api = `${url.origin}/examples/api/hello`;
    const res = await fetch(api);

    if (!res.ok) {
      throw new Error(`Failed to fetch data from ${api}`);
    }

    const data = (await res.json()) as HelloData;
    return html(data);
  },
});

export default defineRouteComponent<HelloData>(function Page({ data }) {
  return (
    <BaseLayout>
      <div className={shared.container}>
        <h1 className={shared.pageTitle}>🔄 Data Fetching</h1>

        <div className={`${shared.highlight} ${shared.info}`}>
          <h2>Fetch data on the server and render as static HTML</h2>
          <p>
            The following data is fetched on the server and rendered as static
            HTML. No need to wait for client-side loading and data requests,
            content is immediately visible.
          </p>
        </div>

        <div className={shared.mb6}>
          <h3 className={shared.sectionTitle}>
            Benefits of Server-Side Data Fetching
          </h3>
          <div className={`${shared.grid} ${shared.grid3}`}>
            <div className={shared.card}>
              <div className={shared.cardIcon}>🔍</div>
              <h4 className={shared.cardTitle}>SEO Optimized</h4>
              <p className={shared.cardDescription}>
                Search engines can directly index complete data content
              </p>
            </div>
            <div className={shared.card}>
              <div className={shared.cardIcon}>📱</div>
              <h4 className={shared.cardTitle}>Better User Experience</h4>
              <p className={shared.cardDescription}>
                Especially suitable for mobile devices and slow network
                environments
              </p>
            </div>
            <div className={shared.card}>
              <div className={shared.cardIcon}>🛡️</div>
              <h4 className={shared.cardTitle}>Data Security</h4>
              <p className={shared.cardDescription}>
                Sensitive API keys and logic only run on the server
              </p>
            </div>
          </div>
        </div>

        <div className={`${shared.infoPanel} ${shared.success}`}>
          <h3 className={shared.subsectionTitle}>Demo Data</h3>
          <p>The following data is fetched through server-side API calls:</p>

          <div
            className={`${shared.grid} ${shared.grid2}`}
            style={{ marginTop: '1.5rem' }}>
            {data.map((item, index) => (
              <div key={index} className={shared.card}>
                <h4 className={shared.cardTitle}>{item.title}</h4>
                <p className={shared.textMuted} style={{ margin: 0 }}>
                  Data item #{index + 1}
                </p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <p>
              <strong>Data source:</strong>
              <a
                href="/examples/api/hello"
                target="_blank"
                className={shared.link}>
                /api/hello
              </a>
            </p>
            <p
              className={shared.textMuted}
              style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Click the link above to view the original API response data
            </p>
          </div>
        </div>
      </div>

      {/* Edit button - only shown in development */}
      <EditButton currentFileUrl={import.meta.url} />
    </BaseLayout>
  );
});
