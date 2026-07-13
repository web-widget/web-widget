import { defineRouteComponent } from '@web-widget/helpers';
import BaseLayout from '../(components)/BaseLayout';
import { PageHeader, Section } from '../(components)/ui';

export default defineRouteComponent(function Page(props) {
  const { name } = props.params;
  return (
    <BaseLayout>
      <PageHeader
        title="Dynamic routes"
        description="File-system routing supports dynamic path parameters. The URL segment below is passed as a parameter to the route."
      />
      <Section title={`Greetings to you, ${JSON.stringify(name)}!`}>
        <ul>
          <li>
            <a href="/dynamic-routes/web-route">web-route</a>
          </li>
          <li>
            <a href="/dynamic-routes/builder">builder</a>
          </li>
          <li>
            <a href="/dynamic-routes/react">react</a>
          </li>
          <li>
            <a href="/dynamic-routes/vue">vue</a>
          </li>
          <li>
            <a href="/dynamic-routes/html">html</a>
          </li>
        </ul>
      </Section>
    </BaseLayout>
  );
});
