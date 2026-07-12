import { html, asHtmlWidget } from '@web-widget/html';
import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import CounterWidget from './(components)/Counter@widget.tsx';
import { baseLayout } from './(components)/baseLayout.html';
import styles from './index.module.css';
import shared from './(components)/shared.module.css';

const counter = asHtmlWidget<{ count: number }>(CounterWidget);

export const meta = defineMeta({
  title: 'Web Widget',
});

export default defineRouteComponent(function Page() {
  return baseLayout(html`
    <div class="${shared.container}">
      <div class="${styles.hero}">
        <h1 class="${shared.pageTitle}">
          <span>Simple &amp; Powerful</span>
          <br />
          <span>Tech-stack-agnostic</span> <span>Web Framework</span>
        </h1>
        <p class="${styles.subtitle}">
          Built on web standards, cross-platform, integrates with different
          frontend UI frameworks
        </p>
      </div>

      <div class="${styles.demoSection}">
        <div class="${styles.heroDemo}">
          <p class="${styles.demoIntro}">✨ Widget in the page</p>
          ${Counter({ count: 0 })}
          <p class="${styles.demoHint}">
            This is an interactive widget demo, which can use any tech stack
          </p>
        </div>
      </div>

      <div class="${shared.mb6}">
        <h2 class="${shared.sectionTitle}">Basic Examples</h2>
        <div class="${shared.grid} ${shared.grid3}">
          <a
            class="${shared.card} ${shared.cardHover} ${shared.linkCard}"
            href="/examples/static">
            <div class="${shared.textCenter}">
              <div class="${shared.cardIcon}">📄</div>
              <h3 class="${shared.cardTitle}">Static Page</h3>
              <p class="${shared.cardDescription}">
                Pure static HTML page, no client-side JavaScript required
              </p>
            </div>
          </a>
          <a
            class="${shared.card} ${shared.cardHover} ${shared.linkCard}"
            href="/examples/params/web-widget">
            <div class="${shared.textCenter}">
              <div class="${shared.cardIcon}">🎯</div>
              <h3 class="${shared.cardTitle}">Dynamic Routing</h3>
              <p class="${shared.cardDescription}">
                File-system-based dynamic route handling
              </p>
            </div>
          </a>
          <a
            class="${shared.card} ${shared.cardHover} ${shared.linkCard}"
            href="/examples/fetch">
            <div class="${shared.textCenter}">
              <div class="${shared.cardIcon}">🔄</div>
              <h3 class="${shared.cardTitle}">Data Fetching</h3>
              <p class="${shared.cardDescription}">
                Fetch data on the server and render as static HTML
              </p>
            </div>
          </a>
          <a
            class="${shared.card} ${shared.cardHover} ${shared.linkCard}"
            href="/examples/action">
            <div class="${shared.textCenter}">
              <div class="${shared.cardIcon}">⚡</div>
              <h3 class="${shared.cardTitle}">Server Actions</h3>
              <p class="${shared.cardDescription}">
                Call server-side functions directly from the client
              </p>
            </div>
          </a>
          <a
            class="${shared.card} ${shared.cardHover} ${shared.linkCard}"
            href="/examples/frameworks">
            <div class="${shared.textCenter}">
              <div class="${shared.cardIcon}">🍀</div>
              <h3 class="${shared.cardTitle}">Widgets</h3>
              <p class="${shared.cardDescription}">
                React and Vue components work seamlessly on the same page
              </p>
            </div>
          </a>
          <a
            class="${shared.card} ${shared.cardHover} ${shared.linkCard}"
            href="/examples/middleware">
            <div class="${shared.textCenter}">
              <div class="${shared.cardIcon}">🧅</div>
              <h3 class="${shared.cardTitle}">Middleware</h3>
              <p class="${shared.cardDescription}">
                Control requests and responses, and modify page metadata
              </p>
            </div>
          </a>
        </div>
      </div>
    </div>
  `);
});
