import ReactCounter from "./_components/Counter.widget.tsx";
import BaseLayout from "./_components/BaseLayout.tsx";

export default function Page() {
  return (
    <BaseLayout>
      <h1>Adding interactivity</h1>
      <ReactCounter name="React Counter" start={3} />
    </BaseLayout>
  );
}
