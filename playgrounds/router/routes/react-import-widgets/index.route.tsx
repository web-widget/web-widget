import BaseLayout from '../(components)/BaseLayout.tsx';
import { PageHeader } from '../(components)/ui';
import ImportWidgetsWidget from './ImportWidgets@widget.tsx';

export default function Page() {
  return (
    <BaseLayout>
      <PageHeader
        title="React: Import Vue2 and Vue3"
        description="A React route that imports and renders Vue 2 and Vue 3 widgets as nested components."
      />
      <ImportWidgetsWidget />
    </BaseLayout>
  );
}
