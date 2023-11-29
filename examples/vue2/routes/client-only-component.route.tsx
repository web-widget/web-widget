import VueCounter from "../widgets/Counter.widget.vue";
import BaseLayout from "../components/BaseLayout.tsx";

export default function Page() {
  return (
    <BaseLayout>
      <h1>Client only component</h1>
      <VueCounter renderStage="client" name="Vue Counter" start={3} />
    </BaseLayout>
  );
}
