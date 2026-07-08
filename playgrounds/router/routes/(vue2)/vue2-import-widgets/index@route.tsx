import BaseLayout from '../../(components)/BaseLayout.tsx';
import App from './App@widget.vue';
import { asReactWidget } from '@web-widget/vue2';

const RApp = asReactWidget(App);

export default function Page() {
  return (
    <BaseLayout>
      <h1>Vue2: Import React and Vue3</h1>
      <RApp />
    </BaseLayout>
  );
}
