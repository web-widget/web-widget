import { html, suspense, fallback, asHtmlWidget } from '@web-widget/html';
import type { HTML } from '@web-widget/html';
import { defineRouteComponent } from '@web-widget/helpers';
import Wait from './(components)/Wait@widget';
import Fail from './(components)/Fail@widget';

const WaitWidget = asHtmlWidget<{ id: string }>(Wait);
const FailWidget = asHtmlWidget<{ id: string }>(Fail);

/** A promise that resolves to HTML after `ms` milliseconds. */
function slowHTML(ms: number, content: HTML): Promise<HTML> {
  return new Promise((resolve) => setTimeout(() => resolve(content), ms));
}

/** A promise that rejects after `ms` milliseconds. */
function failAfter(ms: number): Promise<HTML> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Data fetch failed')), ms)
  );
}

const loading = html`<div style="background:#f3f3f3">Loading...</div>`;
const error = html`<div style="background:#fee;color:#c00">
  Something went wrong.
</div>`;

export default defineRouteComponent(async function Page() {
  return html`<style>
      .slot {
        height: 60px;
        box-sizing: border-box;
        overflow: hidden;
      }
      .slot > div {
        height: 100%;
        box-sizing: border-box;
        padding: 16px;
        display: flex;
        align-items: center;
      }
    </style>
    <div>
      <h1>HTML Streaming Error Recovery</h1>
      <p>
        This page demonstrates Suspense streaming with error recovery. The
        failing section is caught and its fallback stays visible — the rest of
        the page remains functional.
      </p>

      <h2>Normal section (succeeds in ~1s)</h2>
      <div class="slot">
        ${suspense(
          slowHTML(
            1000,
            html`<div style="background:#42d392;color:#fff">
              Section loaded successfully!
            </div>`
          ),
          loading
        )}
      </div>

      <h2>Failing section (rejects in ~1s)</h2>
      <div class="slot">
        ${fallback(suspense(failAfter(1000), loading), error)}
      </div>

      <h2>Widget that succeeds (~1-3s)</h2>
      <div class="slot">
        ${WaitWidget({ id: 'ok:0', widget: { fallback: loading } })}
      </div>

      <h2>Widget that fails (~0.5s)</h2>
      <div class="slot">
        ${FailWidget({ id: 'fail:0', widget: { fallback: { pending: loading, error } } })}
      </div>

      <h2>Another normal section after the failure</h2>
      <div class="slot">
        ${suspense(
          slowHTML(
            500,
            html`<div style="background:#0074a6;color:#fff">
              Page recovered — this section works fine!
            </div>`
          ),
          loading
        )}
      </div>

      <p>This footer appears immediately and stays regardless of errors.</p>
    </div>`;
});
