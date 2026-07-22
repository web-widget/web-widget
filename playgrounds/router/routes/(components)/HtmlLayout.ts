import { html, type HTML, unsafeHTML } from '@web-widget/html';
import '../(css)/base-layout.css';
import '../(css)/ui.css';
import Menu from './Menu';
import { menuEnhancementScript } from './menu-client';

export function htmlLayout(children: HTML): HTML {
  return html`<header class="site-header">
      <h1>Web Router Playground</h1>
    </header>
    <div class="container">
      <aside data-playground-menu>${Menu()}</aside>
      <main>${children}</main>
    </div>
    <footer><p>This is a footer</p></footer>
    <script>${unsafeHTML(menuEnhancementScript)}</script>`;
}
