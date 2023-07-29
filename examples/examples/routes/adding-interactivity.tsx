import ReactCounter from "../widgets/Counter.tsx";
import { render } from "@web-widget/react";

export { render };

export default function Page() {
  return (
    <>
      <h1>Adding interactivity</h1>
      <ReactCounter client name="React Counter" start={3} />
    </>
  );
}
