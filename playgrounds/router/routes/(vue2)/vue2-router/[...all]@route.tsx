import { defineMeta, defineRouteComponent } from '@web-widget/helpers';
import BaseLayout from '../../(components)/BaseLayout';
import App from './App@widget';
import { asReactWidget } from '@web-widget/vue2/adapter';

const RApp = asReactWidget<any>(App);

export const meta = defineMeta({
  title: 'Hello, Vue Router',
});

export default defineRouteComponent(function Page(props) {
  const request = props.request;
  const url = new URL(request.url);
  const fullPath = `${url.pathname}${url.search}`;
  return (
    <BaseLayout>
      <h1>Vue2: Router</h1>
      <p>
        Integrate vue-router 3 inside a Web Widget route. Client-side navigation
        is handled by Vue Router below.
      </p>
      <RApp route={fullPath} />
    </BaseLayout>
  );
});
