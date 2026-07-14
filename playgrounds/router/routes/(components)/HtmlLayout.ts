import { html, type HTML } from '@web-widget/html';
import '../(css)/base-layout.css';
import '../(css)/ui.css';

const menuHTML = html`<ul class="menu">
  <li class="menu-home"><a href="/">🏠 Home</a></li>
  <li class="menu-category">Server Components</li>
  <li><a href="/react-server-component">React: Server component</a></li>
  <li><a href="/vue3-server-component">Vue3: Server component</a></li>
  <li><a href="/vue2-server-component">Vue2: Server component</a></li>
  <li><a href="/client-only-component">Client only component</a></li>
  <li><a href="/experimental-async-component">Async component</a></li>
  <li class="menu-category">Styling</li>
  <li><a href="/style">Basic CSS</a></li>
  <li><a href="/large-css">Large CSS (external link)</a></li>
  <li><a href="/css-lazy-dynamic">CSS: lazy chunk (dynamic import)</a></li>
  <li><a href="/vue-module-css">Vue: CSS Modules</a></li>
  <li class="menu-category">Routing</li>
  <li><a href="/dynamic-routes/@web-widget">Dynamic routes</a></li>
  <li><a href="/custom-handlers">Custom handlers</a></li>
  <li><a href="/form">Form submissions</a></li>
  <li><a href="/background-tasks">Background tasks</a></li>
  <li><a href="/meta">Meta</a></li>
  <li class="menu-category">Data Fetching</li>
  <li><a href="/fetching-data">Fetching data</a></li>
  <li><a href="/request-cache">Request cache</a></li>
  <li><a href="/server-action">Server action</a></li>
  <li>
    <a target="_blank" href="/api/hello-world">API: Hello World</a>
  </li>
  <li class="menu-category">Progressive Rendering</li>
  <li><a href="/react-streaming">React: Streaming</a></li>
  <li><a href="/react-streaming-error">React: Streaming error</a></li>
  <li>
    <a target="_blank" href="/react-shell-error">React: Shell error (500)</a>
  </li>
  <li><a href="/vue3-streaming">Vue3: Streaming</a></li>
  <li><a href="/vue3-shell-error">Vue3: Shell Error (500)</a></li>
  <li><a href="/html-suspense-streaming">HTML: Suspense Streaming</a></li>
  <li><a href="/html-streaming-error">HTML: Streaming Error</a></li>
  <li>
    <a target="_blank" href="/html-shell-error">HTML: Shell Error (500)</a>
  </li>
  <li class="menu-category">Cross-Framework</li>
  <li><a href="/react-and-vue">Using react and vue together</a></li>
  <li><a href="/react-import-widgets">React: Import vue2 and vue3</a></li>
  <li><a href="/vue3-import-widgets">Vue3: Import react and vue2</a></li>
  <li><a href="/vue2-import-widgets">Vue2: Import react and vue3</a></li>
  <li><a href="/html-import-widgets">HTML: Import react and vue</a></li>
  <li class="menu-category">Error Handling</li>
  <li><a href="/fallback">Route-level fallback</a></li>
  <li class="menu-category">Integration</li>
  <li><a href="/vue3-router">Using vue3 router</a></li>
  <li><a href="/vue2-router">Using vue2 router</a></li>
</ul>`;

export function htmlLayout(children: HTML): HTML {
  return html`<header class="site-header">
      <h1>Web Router Playground</h1>
    </header>
    <div class="container">
      <aside>${menuHTML}</aside>
      <main>${children}</main>
    </div>
    <footer><p>This is a footer</p></footer>
    <script>
      (function () {
        var p = location.pathname;
        document.querySelectorAll('aside a[href]').forEach(function (a) {
          if (a.getAttribute('href') === p)
            a.setAttribute('aria-current', 'page');
        });
      })();
    </script>`;
}
