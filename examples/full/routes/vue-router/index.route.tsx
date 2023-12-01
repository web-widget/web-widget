import type { RouteComponentProps } from "@web-widget/react";
import BaseLayout from "../../components/BaseLayout";
import App from "./App.widget?as=jsx";

export const meta = {
  title: "Hello, Vue Router",
};

export default function Page(props: RouteComponentProps) {
  const request = props.request;
  const url = new URL(request.url);
  const path = `${url.pathname}${url.search}`;
  return (
    <BaseLayout>
      <h1>Vue router</h1>
      <App startUrl={path} />
    </BaseLayout>
  );
}
