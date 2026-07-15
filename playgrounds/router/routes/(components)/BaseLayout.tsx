import '../(css)/base-layout.css';

import type { ComponentProps } from 'react';
import { container } from '@web-widget/react/adapter';

const Menu = container(() => import('./Menu@widget.ts'));

export default function BaseLayout({ children }: ComponentProps<any>) {
  return (
    <>
      <header className="site-header">
        <h1>Web Router Playground</h1>
      </header>
      <div className="container">
        <aside>
          <Menu widget={{ serverOnly: true }} />
        </aside>
        <main>{children}</main>
      </div>
      <footer>
        <p>This is a footer</p>
      </footer>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var p=location.pathname;document.querySelectorAll('aside a[href]').forEach(function(a){if(a.getAttribute('href')===p)a.setAttribute('aria-current','page')})})();`,
        }}
      />
    </>
  );
}
