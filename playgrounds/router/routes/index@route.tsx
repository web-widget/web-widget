import { defineMeta, defineRouteComponent } from '@web-widget/helpers';
import BaseLayout from './(components)/BaseLayout';
import { navigation } from './(components)/catalog';
import { Card, CardGrid, PageHeader, Section } from './(components)/ui';

export const meta = defineMeta({ title: 'Web Router Playground' });

export default defineRouteComponent(function Home() {
  return (
    <BaseLayout>
      <PageHeader
        title="Web Router Playground"
        description="Framework baselines, Web Widget feature labs, cross-framework interoperability, and ecosystem integrations."
      />
      {navigation.map((group) => (
        <Section key={group.name} title={group.name}>
          <CardGrid>
            {group.items.map((item) => (
              <Card key={item.href}>
                <a
                  className="ds-card-link"
                  href={item.href}
                  {...(item.external ? { target: '_blank' } : {})}>
                  {item.title}
                </a>
                <p className="ds-card-desc">{item.description}</p>
              </Card>
            ))}
          </CardGrid>
        </Section>
      ))}
    </BaseLayout>
  );
});
