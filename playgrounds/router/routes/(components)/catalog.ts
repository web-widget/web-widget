export type Capability =
  | 'ssr'
  | 'streaming'
  | 'progressiveRendering'
  | 'widgetEmbedding'
  | 'hydration'
  | 'csr';

export interface FrameworkDefinition {
  id: string;
  name: string;
  href?: string;
  capabilities: Record<Capability, boolean | 'conditional'>;
}

export interface NavigationItem {
  href: string;
  title: string;
  description: string;
  external?: boolean;
}

export interface NavigationGroup {
  name: 'Frameworks' | 'Features' | 'Interoperability' | 'Integrations';
  items: NavigationItem[];
}

export const frameworks: FrameworkDefinition[] = [
  {
    id: 'react',
    name: 'React',
    href: '/frameworks/react',
    capabilities: {
      ssr: true,
      streaming: true,
      progressiveRendering: true,
      widgetEmbedding: true,
      hydration: true,
      csr: true,
    },
  },
  {
    id: 'html',
    name: 'HTML',
    href: '/frameworks/html',
    capabilities: {
      ssr: true,
      streaming: true,
      progressiveRendering: true,
      widgetEmbedding: true,
      hydration: false,
      csr: false,
    },
  },
  {
    id: 'vue3',
    name: 'Vue 3',
    href: '/frameworks/vue3',
    capabilities: {
      ssr: true,
      streaming: true,
      progressiveRendering: false,
      widgetEmbedding: true,
      hydration: true,
      csr: true,
    },
  },
  {
    id: 'vue2',
    name: 'Vue 2',
    href: '/frameworks/vue2',
    capabilities: {
      ssr: true,
      streaming: false,
      progressiveRendering: false,
      widgetEmbedding: true,
      hydration: true,
      csr: true,
    },
  },
  {
    id: 'svelte',
    name: 'Svelte',
    href: '/frameworks/svelte',
    capabilities: {
      ssr: true,
      streaming: false,
      progressiveRendering: false,
      widgetEmbedding: true,
      hydration: true,
      csr: true,
    },
  },
  {
    id: 'solid',
    name: 'Solid',
    href: '/frameworks/solid',
    capabilities: {
      ssr: true,
      streaming: true,
      progressiveRendering: true,
      widgetEmbedding: true,
      hydration: 'conditional',
      csr: true,
    },
  },
  {
    id: 'preact',
    name: 'Preact',
    href: '/frameworks/preact',
    capabilities: {
      ssr: true,
      streaming: false,
      progressiveRendering: false,
      widgetEmbedding: true,
      hydration: true,
      csr: true,
    },
  },
  {
    id: 'web-components',
    name: 'Web Components',
    capabilities: {
      ssr: false,
      streaming: false,
      progressiveRendering: false,
      widgetEmbedding: false,
      hydration: false,
      csr: true,
    },
  },
  {
    id: 'lit',
    name: 'Lit',
    capabilities: {
      ssr: false,
      streaming: false,
      progressiveRendering: false,
      widgetEmbedding: false,
      hydration: false,
      csr: true,
    },
  },
];

export const navigation: NavigationGroup[] = [
  {
    name: 'Frameworks',
    items: [
      {
        href: '/frameworks',
        title: 'Capability overview',
        description: 'Compare adapter rendering and lifecycle capabilities.',
      },
      ...frameworks
        .filter(
          (framework): framework is FrameworkDefinition & { href: string } =>
            Boolean(framework.href)
        )
        .map(({ href, name, capabilities }) => ({
          href,
          title: name,
          description: capabilities.ssr
            ? 'Native SSR route importing a same-framework component.'
            : 'Client-only interactive widget baseline.',
        })),
    ],
  },
  {
    name: 'Features',
    items: [
      {
        href: '/client-only-component',
        title: 'Client-only rendering',
        description: 'Skip server rendering and mount in the browser.',
      },
      {
        href: '/experimental-async-component',
        title: 'Async component',
        description: 'Await asynchronous component data before rendering.',
      },
      {
        href: '/react-streaming',
        title: 'React streaming',
        description: 'Progressive rendering with React Suspense.',
      },
      {
        href: '/vue3-streaming',
        title: 'Vue 3 streaming',
        description: 'Progressive rendering with Vue Suspense.',
      },
      {
        href: '/html-suspense-streaming',
        title: 'HTML streaming',
        description: 'Tag-based progressive HTML rendering.',
      },
      {
        href: '/fallback',
        title: 'Fallback and errors',
        description: 'Route-level fallback behavior.',
      },
      {
        href: '/style',
        title: 'Basic CSS',
        description: 'CSS imported by routes and widgets.',
      },
      {
        href: '/css-lazy-dynamic',
        title: 'Lazy CSS',
        description: 'CSS emitted with dynamically imported widgets.',
      },
      {
        href: '/large-css',
        title: 'External CSS',
        description: 'Emit CSS beyond the inline threshold.',
      },
      {
        href: '/fetching-data',
        title: 'Data fetching',
        description: 'Fetch data before rendering widgets.',
      },
      {
        href: '/request-cache',
        title: 'Request cache',
        description: 'Deduplicate data within a request.',
      },
    ],
  },
  {
    name: 'Interoperability',
    items: [
      {
        href: '/react-and-vue',
        title: 'Mixed framework page',
        description: 'Render React and Vue widgets together.',
      },
      {
        href: '/react-import-widgets',
        title: 'React host',
        description: 'Import Vue 2 and Vue 3 widgets into React.',
      },
      {
        href: '/vue3-import-widgets',
        title: 'Vue 3 host',
        description: 'Import React and Vue 2 widgets into Vue 3.',
      },
      {
        href: '/vue2-import-widgets',
        title: 'Vue 2 host',
        description: 'Import React and Vue 3 widgets into Vue 2.',
      },
      {
        href: '/html-import-widgets',
        title: 'HTML host',
        description: 'Import framework widgets into an HTML route.',
      },
    ],
  },
  {
    name: 'Integrations',
    items: [
      {
        href: '/dynamic-routes/@web-widget',
        title: 'Dynamic routes',
        description: 'Filesystem routes with dynamic parameters.',
      },
      {
        href: '/custom-handlers',
        title: 'Custom handlers',
        description: 'Control request and response handling.',
      },
      {
        href: '/form',
        title: 'Forms',
        description: 'Progressively enhanced form submissions.',
      },
      {
        href: '/background-tasks',
        title: 'Background tasks',
        description: 'Continue work after sending a response.',
      },
      {
        href: '/server-action',
        title: 'Server actions',
        description: 'Invoke server functions from widgets.',
      },
      {
        href: '/meta',
        title: 'Document metadata',
        description: 'Configure route head metadata.',
      },
      {
        href: '/vue3-router',
        title: 'Vue Router 4',
        description: 'Embed Vue Router in a Web Widget route.',
      },
      {
        href: '/vue2-router',
        title: 'Vue Router 3',
        description: 'Embed Vue Router in a Vue 2 widget.',
      },
      {
        href: '/api/hello-world',
        title: 'API route',
        description: 'Serve JSON alongside page routes.',
        external: true,
      },
    ],
  },
];
