import '../(css)/base-layout.css';

import type { ComponentProps } from 'react';
import Menu from '@playgrounds/web-router-vue3/Menu@widget.vue';
import { asReactWidget } from '@playgrounds/web-router-vue3/helpers';

const RMenu = asReactWidget(Menu);

export default function BaseLayout({ children }: ComponentProps<any>) {
  return (
    <>
      <header>
        <h1>Web Router Playground</h1>
      </header>
      <div className="container">
        <aside>
          <RMenu widget={{ serverOnly: true }} />
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
