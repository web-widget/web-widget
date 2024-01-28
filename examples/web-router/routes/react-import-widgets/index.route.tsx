import BaseLayout from '../(components)/BaseLayout.tsx';
import ImportWidgetsWidget from './ImportWidgets@widget.tsx';

export default function Page() {
  return (
    <BaseLayout>
      <h1>React: Import Vue2 and Vue3</h1>
      <ImportWidgetsWidget />
    </BaseLayout>
  );
}
