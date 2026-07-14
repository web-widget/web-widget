import { html } from '@web-widget/html';

export default function FeatureSummary() {
  return html`<section class="ds-section">
    <h2>Template component</h2>
    <p>
      This content comes from a separate HTML component imported by the route.
      Values are escaped by default and the result remains stream-compatible.
    </p>
    <ul>
      <li>Server-rendered tagged templates</li>
      <li>Streaming responses</li>
      <li>Progressive rendering with <code>suspense()</code></li>
    </ul>
  </section>`;
}
