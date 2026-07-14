import type React from 'react';
import { defineMeta, defineRouteComponent } from '@web-widget/helpers';
import { container } from '@web-widget/react/adapter';
import BaseLayout from '../../(components)/BaseLayout';
import { PageHeader } from '../../(components)/ui';

// `route` is consumed by createVueRender's onCreatedApp, not a component prop.
const RApp = container(() => import('./App@widget')) as React.FC<any>;

export const meta = defineMeta({
  title: 'Hello, Vue Router',
});

export default defineRouteComponent(function Page(props) {
  const request = props.request;
  const url = new URL(request.url);
  const fullPath = `${url.pathname}${url.search}`;
  return (
    <BaseLayout>
      <PageHeader
        title="Vue2: Router"
        description="Integrate vue-router 3 inside a Web Widget route. Client-side navigation is handled by Vue Router below."
      />
      <RApp route={fullPath} />
    </BaseLayout>
  );
});
