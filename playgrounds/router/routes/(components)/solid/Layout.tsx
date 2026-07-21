/** @jsxImportSource solid-js */
import type { JSX } from 'solid-js';
import '~/routes/(css)/base-layout.css';
import '~/routes/(css)/ui.css';
import Menu from './Menu';

export default function Layout(props: { children: JSX.Element }) {
  return (
    <>
      <header class="site-header">
        <h1>Web Router Playground</h1>
      </header>
      <div class="container">
        <aside>
          <Menu />
        </aside>
        <main>{props.children}</main>
      </div>
      <footer>
        <p>This is a footer</p>
      </footer>
      <script innerHTML={activeMenuScript} />
    </>
  );
}

const activeMenuScript = `(function(){var p=location.pathname;document.querySelectorAll('aside a[href]').forEach(function(a){if(a.getAttribute('href')===p)a.setAttribute('aria-current','page')})})();`;
