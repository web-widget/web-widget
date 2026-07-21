import { defineMeta, defineRouteComponent } from '@web-widget/helpers';
import BaseLayout from '../(components)/BaseLayout';
import { frameworks } from '../(components)/catalog';
import { PageHeader, Section } from '../(components)/ui';

export const meta = defineMeta({ title: 'Framework adapters' });

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <PageHeader
        title="Framework adapters"
        description="Compare adapter capabilities. SSR examples use native route modules that import components from the same framework."
      />
      <Section
        title="Capability matrix"
        description="Streaming means the adapter can return a streamed response. Progressive rendering means async content can be revealed incrementally over that stream. Widget embedding means the framework can integrate Widgets into its component tree through widget().">
        <div className="ds-table-wrap">
          <table className="ds-table">
            <thead>
              <tr>
                <th scope="col">Framework</th>
                <th scope="col">CSR</th>
                <th scope="col">SSR</th>
                <th scope="col">Hydration</th>
                <th scope="col">Streaming</th>
                <th scope="col">Progressive rendering</th>
                <th scope="col">Widget embedding</th>
              </tr>
            </thead>
            <tbody>
              {frameworks.map(({ name, href, capabilities }) => (
                <tr key={name}>
                  <th scope="row">{href ? <a href={href}>{name}</a> : name}</th>
                  <td>{formatCapability(capabilities.csr)}</td>
                  <td>{formatCapability(capabilities.ssr)}</td>
                  <td>{formatCapability(capabilities.hydration)}</td>
                  <td>{formatCapability(capabilities.streaming)}</td>
                  <td>{formatCapability(capabilities.progressiveRendering)}</td>
                  <td>{formatCapability(capabilities.widgetEmbedding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </BaseLayout>
  );
});

function formatCapability(value: boolean | 'conditional') {
  const state = value === 'conditional' ? 'conditional' : value ? 'yes' : 'no';
  const label = value === 'conditional' ? 'Conditional' : value ? 'Yes' : 'No';
  return (
    <span className="ds-capability" data-capability={state}>
      {label}
    </span>
  );
}
