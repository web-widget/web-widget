import ReactCounter from "./(components)/Counter@widget.tsx";
import BaseLayout from "./(components)/BaseLayout.tsx";

export default function Page() {
  return (
    <BaseLayout>
      <h1>Client only component</h1>
      <ReactCounter renderStage="client" name="React Counter" start={3} />
    </BaseLayout>
  );
}
