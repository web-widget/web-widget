import { defineRouteComponent } from '@web-widget/helpers';
import BaseLayout from '../(components)/BaseLayout';
import Echo from './Echo@widget';

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Server action</h1>
      <Echo />
    </BaseLayout>
  );
});
