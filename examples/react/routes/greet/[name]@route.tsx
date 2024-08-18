import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import BaseLayout from '../(components)/BaseLayout.tsx';

interface Params {
  name: string;
}

export const meta = defineMeta({
  title: 'Dynamic routes - Web Widget',
});

export default defineRouteComponent<null, Params>(function Page({ params }) {
  const { name } = params;
  return (
    <BaseLayout>
      <h1>Dynamic routes</h1>
      <p>Greetings to you, {name}!</p>
      <p>
        <a href="/greet/react">react</a>
      </p>
      <p>
        <a href="/greet/vue">vue</a>
      </p>
    </BaseLayout>
  );
});
