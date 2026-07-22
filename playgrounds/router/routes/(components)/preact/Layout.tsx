/** @jsxImportSource preact */
import type { ComponentChildren } from 'preact';
import '~/routes/(css)/base-layout.css';
import '~/routes/(css)/ui.css';
import Menu from './Menu';
import { menuEnhancementScript } from '../menu-client';

export default function Layout({ children }: { children: ComponentChildren }) {
  return (
    <>
      <header class="site-header">
        <h1>Web Router Playground</h1>
      </header>
      <div class="container">
        <aside data-playground-menu>
          <Menu />
        </aside>
        <main>{children}</main>
      </div>
      <footer>
        <p>This is a footer</p>
      </footer>
      <script dangerouslySetInnerHTML={{ __html: menuEnhancementScript }} />
    </>
  );
}
