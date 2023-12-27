import type { RouteComponentProps } from "@web-widget/react";
import App from "./App.widget?as=jsx";
import BaseLayout from "../../components/BaseLayout";

export const meta = {
  title: "Hello, Vue Router",
};

export default function Page(props: RouteComponentProps) {
  const request = props.request;
  const url = new URL(request.url);
  const fullPath = `${url.pathname}${url.search}`;
  return (
    <BaseLayout>
      <h1>Vue router</h1>
      <App route={fullPath} />
    </BaseLayout>
  );
}
