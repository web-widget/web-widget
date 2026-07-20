import { defineMeta, defineRouteComponent } from '@web-widget/helpers';
import BaseLayout from '~/routes/(components)/BaseLayout';
import { shadowDomFrameworks } from '~/routes/(components)/catalog';
import { Card, CardGrid, PageHeader, Section } from '~/routes/(components)/ui';

export const meta = defineMeta({ title: 'Shadow DOM' });

export default defineRouteComponent(function ShadowDomPage() {
  return (
    <BaseLayout>
      <PageHeader
        title="Shadow DOM"
        description="Compare framework routes whose imported Widgets render into isolated declarative shadow roots."
      />
      <Section title="Framework examples">
        <CardGrid>
          {shadowDomFrameworks.map(({ href, name }) => (
            <Card key={href}>
              <a className="ds-card-link" href={href}>
                {name}
              </a>
              <p className="ds-card-desc">
                Render and hydrate Widgets from the {name} route.
              </p>
            </Card>
          ))}
        </CardGrid>
      </Section>
    </BaseLayout>
  );
});
