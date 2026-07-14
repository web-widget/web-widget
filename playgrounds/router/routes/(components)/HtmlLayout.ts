import { html, type HTML } from '@web-widget/html';
import '../(css)/base-layout.css';
import '../(css)/ui.css';
import Menu from './Menu';

export function htmlLayout(children: HTML): HTML {
  return html`<header class="site-header">
      <h1>Web Router Playground</h1>
    </header>
    <div class="container">
      <aside>${Menu()}</aside>
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
