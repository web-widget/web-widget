import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import BaseLayout from './(components)/BaseLayout';
import { PageHeader, Section, CardGrid, Card } from './(components)/ui';

export const meta = defineMeta({
  title: 'Web Router Playground',
});

interface FeatureItem {
  href: string;
  title: string;
  desc: string;
  external?: boolean;
}

interface FeatureCategory {
  name: string;
  icon: string;
  items: FeatureItem[];
}

const categories: FeatureCategory[] = [
  {
    name: 'Server Components',
    icon: '#',
    items: [
      {
        href: '/react-server-component',
        title: 'React: Server component',
        desc: 'Render React components on the server and hydrate on the client.',
      },
      {
        href: '/vue3-server-component',
        title: 'Vue3: Server component',
        desc: 'Vue 3 single-file components running as server widgets.',
      },
      {
        href: '/vue2-server-component',
        title: 'Vue2: Server component',
        desc: 'Vue 2 components coexisting with Vue 3 in the same app.',
      },
      {
        href: '/client-only-component',
        title: 'Client only component',
        desc: 'Components that skip server rendering and load only in the browser.',
      },
      {
        href: '/experimental-async-component',
        title: 'Async component',
        desc: 'Async server components that await data before rendering.',
      },
    ],
  },
  {
    name: 'Styling',
    icon: '#',
    items: [
      {
        href: '/style',
        title: 'Basic CSS',
        desc: 'Import and apply plain CSS files to routes.',
      },
      {
        href: '/large-css',
        title: 'Large CSS (external link)',
        desc: 'CSS beyond the inline threshold is emitted as an external file.',
      },
      {
        href: '/css-lazy-dynamic',
        title: 'CSS: lazy chunk',
        desc: 'Dynamically imported CSS loaded on demand.',
      },
      {
        href: '/vue-module-css',
        title: 'Vue CSS Modules',
        desc: 'Scoped CSS modules inside Vue single-file components.',
      },
    ],
  },
  {
    name: 'Routing',
    icon: '#',
    items: [
      {
        href: '/dynamic-routes/@web-widget',
        title: 'Dynamic routes',
        desc: 'File-system routing with dynamic path parameters.',
      },
      {
        href: '/custom-handlers',
        title: 'Custom handlers',
        desc: 'Full control over request/response via custom route handlers.',
      },
      {
        href: '/form',
        title: 'Form submissions',
        desc: 'Handle form POST requests with progressive enhancement.',
      },
      {
        href: '/background-tasks',
        title: 'Background tasks',
        desc: 'Run work in the background after sending a response.',
      },
      {
        href: '/meta',
        title: 'Meta',
        desc: 'Set document head metadata (title, description, etc.) per route.',
      },
    ],
  },
  {
    name: 'Data Fetching',
    icon: '#',
    items: [
      {
        href: '/fetching-data',
        title: 'Fetching data',
        desc: 'Fetch and render data on the server before sending HTML.',
      },
      {
        href: '/request-cache',
        title: 'Request cache',
        desc: 'Per-request deduplication and caching of data fetches.',
      },
      {
        href: '/server-action',
        title: 'Server action',
        desc: 'Call server-side functions directly from client interactions.',
      },
      {
        href: '/api/hello-world',
        title: 'API: Hello World',
        desc: 'JSON API routes alongside your page routes.',
        external: true,
      },
    ],
  },
  {
    name: 'Progressive Rendering',
    icon: '#',
    items: [
      {
        href: '/react-streaming',
        title: 'React: Streaming',
        desc: 'Stream React content as it becomes ready with Suspense.',
      },
      {
        href: '/react-streaming-error',
        title: 'React: Streaming error',
        desc: 'Graceful error recovery during streamed rendering.',
      },
      {
        href: '/react-shell-error',
        title: 'React: Shell error (500)',
        desc: 'Handling unrecoverable errors in the React shell.',
        external: true,
      },
      {
        href: '/vue3-streaming',
        title: 'Vue3: Streaming',
        desc: 'Progressive rendering with Vue 3 Suspense.',
      },
      {
        href: '/vue3-shell-error',
        title: 'Vue3: Shell Error (500)',
        desc: 'Handling unrecoverable errors in the Vue 3 shell.',
      },
      {
        href: '/html-suspense-streaming',
        title: 'HTML: Suspense Streaming',
        desc: 'Tag-based HTML streaming with the @web-widget/html toolkit.',
        external: true,
      },
      {
        href: '/html-streaming-error',
        title: 'HTML: Streaming Error',
        desc: 'Error recovery for HTML template streaming.',
        external: true,
      },
      {
        href: '/html-shell-error',
        title: 'HTML: Shell Error (500)',
        desc: 'Handling unrecoverable errors in HTML shell rendering.',
        external: true,
      },
    ],
  },
  {
    name: 'Cross-Framework',
    icon: '#',
    items: [
      {
        href: '/react-and-vue',
        title: 'Using React and Vue together',
        desc: 'Mix React and Vue widgets on the same page seamlessly.',
      },
      {
        href: '/react-import-widgets',
        title: 'React: Import Vue2 and Vue3',
        desc: 'Use Vue 2 and Vue 3 widgets inside a React route.',
      },
      {
        href: '/vue3-import-widgets',
        title: 'Vue3: Import React and Vue2',
        desc: 'Use React and Vue 2 widgets inside a Vue 3 route.',
      },
      {
        href: '/vue2-import-widgets',
        title: 'Vue2: Import React and Vue3',
        desc: 'Use React and Vue 3 widgets inside a Vue 2 route.',
      },
      {
        href: '/html-import-widgets',
        title: 'HTML: Import React and Vue',
        desc: 'Use React, Vue 3, Vue 2, and vanilla widgets inside an HTML template route.',
      },
    ],
  },
  {
    name: 'Error Handling',
    icon: '#',
    items: [
      {
        href: '/fallback',
        title: 'Route-level fallback',
        desc: 'Provide a fallback UI when a route fails to render.',
      },
    ],
  },
  {
    name: 'Integration',
    icon: '#',
    items: [
      {
        href: '/vue3-router',
        title: 'Vue3: Router',
        desc: 'Integrate vue-router 4 inside a Web Widget route.',
      },
      {
        href: '/vue2-router',
        title: 'Vue2: Router',
        desc: 'Integrate vue-router 3 inside a Web Widget route.',
      },
    ],
  },
];

export default defineRouteComponent(function Home() {
  return (
    <BaseLayout>
      <PageHeader
        title="Web Router Playground"
        description={
          <>
            A collection of examples for <code>@web-widget/web-router</code> —
            covering server components, progressive rendering, cross-framework
            widgets, routing, data fetching, styling, and more.
          </>
        }
      />

      {categories.map((cat) => (
        <Section key={cat.name} title={cat.name}>
          <CardGrid>
            {cat.items.map((item) => (
              <Card key={item.href}>
                <a
                  href={item.href}
                  className="ds-card-link"
                  {...(item.external ? { target: '_blank' } : {})}>
                  {item.title}
                </a>
                <p className="ds-card-desc">{item.desc}</p>
              </Card>
            ))}
          </CardGrid>
        </Section>
      ))}
    </BaseLayout>
  );
});
