import BaseLayout from "../components/BaseLayout";
import Wait from "../widgets/Wait";

export { render } from "@web-widget/react";

const Loading = <div>Loading..</div>;

export default async function Page() {
  return (
    <BaseLayout>
      <h1>Streaming</h1>
      <p style={{ background: "yellow" }}>
        💡 This instance needs to run `pnpm start`
      </p>
      <Wait as="web-widget" fallback={Loading} timeout={1000} />
      <Wait as="web-widget" fallback={Loading} timeout={2000} />
      <Wait as="web-widget" fallback={Loading} timeout={3000} />
    </BaseLayout>
  );
}
