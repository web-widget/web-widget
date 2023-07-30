import ReactCounter from "../widgets/Counter.tsx";
import { render } from "@web-widget/react";
import BaseLayout from "../components/BaseLayout";

export { render };

export default function Page() {
  return (
    <BaseLayout>
      <h1>Client only component</h1>
      <ReactCounter clientOnly name="React Counter" start={3} />
    </BaseLayout>
  );
}
