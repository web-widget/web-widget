import BaseLayout from '../(components)/BaseLayout.tsx';
import ImportWidgetsWidget from './ImportWidgets@widget.tsx';

export default function Page() {
  return (
    <BaseLayout>
      <h1>React: Import Vue2 and Vue3</h1>
      <p>
        A React route that imports and renders Vue 2 and Vue 3 widgets as nested
        components.
      </p>
      <ImportWidgetsWidget />
    </BaseLayout>
  );
}
