import type { RouteComponentProps } from "@web-widget/react";
import BaseLayout from "../(components)/BaseLayout";

export default function Page(props: RouteComponentProps) {
  const { name } = props.params;
  return (
    <BaseLayout>
      <h1>Dynamic routes</h1>
      <p>Greetings to you, {JSON.stringify(name)}!</p>
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
    </BaseLayout>
  );
}
