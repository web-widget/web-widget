import ReactCounter from "../widgets/Counter.tsx";
import BaseLayout from "../components/BaseLayout";

export default function Page() {
  return (
    <BaseLayout>
      <h1>Adding interactivity</h1>
      <ReactCounter name="React Counter" start={3} />
    </BaseLayout>
  );
}
