/** @jsxImportSource solid-js */
import type { JSX } from 'solid-js';
import '~/routes/(css)/base-layout.css';
import '~/routes/(css)/ui.css';
import Menu from './Menu';
import { menuEnhancementScript } from '~/routes/(components)/menu-client';

export default function Layout(props: { children: JSX.Element }) {
  return (
    <>
      <header class="site-header">
        <h1>Web Router Playground</h1>
      </header>
      <div class="container">
        <aside data-playground-menu>
          <Menu />
        </aside>
        <main>{props.children}</main>
      </div>
      <footer>
        <p>This is a footer</p>
      </footer>
      <script innerHTML={menuEnhancementScript} />
    </>
  );
}
