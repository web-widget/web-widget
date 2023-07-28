import ReactCounter from "../widgets/Counter.tsx";
import { render } from "@web-widget/react";

export { render };

export default function Page() {
  return (
    <>
      <h1>Client only component</h1>
      <ReactCounter clientOnly name="React Counter" start={3} />
    </>
  );
}
