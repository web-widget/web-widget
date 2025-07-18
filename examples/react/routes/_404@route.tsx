import { defineMeta, defineRouteFallbackComponent } from '@web-widget/helpers';
import BaseLayout from './examples/(components)/BaseLayout.tsx';
import ErrorPage from './examples/(components)/ErrorPage.tsx';
import shared from './examples/(components)/shared.module.css';

export const meta = defineMeta({
  title: '404 - Not Found',
});

export const fallback = defineRouteFallbackComponent(function Page() {
  return (
    <BaseLayout>
      <div className={shared.container}>
        <ErrorPage />
      </div>
    </BaseLayout>
  );
});
