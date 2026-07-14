/** @jsxImportSource preact */
import type { ComponentChildren } from 'preact';
import '../../(css)/base-layout.css';
import '../../(css)/ui.css';
import Menu from './Menu.preact';

export default function Layout({ children }: { children: ComponentChildren }) {
  return (
    <>
      <header class="site-header">
        <h1>Web Router Playground</h1>
      </header>
      <div class="container">
        <aside>
          <Menu />
        </aside>
        <main>{children}</main>
      </div>
      <footer>
        <p>This is a footer</p>
      </footer>
      <script dangerouslySetInnerHTML={{ __html: activeMenuScript }} />
    </>
  );
}

const activeMenuScript = `(function(){var p=location.pathname;document.querySelectorAll('aside a[href]').forEach(function(a){if(a.getAttribute('href')===p)a.setAttribute('aria-current','page')})})();`;
