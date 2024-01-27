import { defineMeta, defineRouteComponent } from "@web-widget/react";
import BaseLayout from "../../(components)/BaseLayout";
import App from "./App@widget?as=jsx";

export const meta = defineMeta({
  title: "Hello, Vue Router",
});

export default defineRouteComponent(function Page(props) {
  const request = props.request;
  const url = new URL(request.url);
  const fullPath = `${url.pathname}${url.search}`;
  return (
    <BaseLayout>
      <h1>Vue3 router</h1>
      <App route={fullPath} />
    </BaseLayout>
  );
});
