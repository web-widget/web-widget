import BaseLayout from "../../(components)/BaseLayout.tsx";
import App from "./App@widget.vue?as=jsx";
export default function Page() {
  return (
    <BaseLayout>
      <h1>Vue2: Import Widgets</h1>
      <App />
    </BaseLayout>
  );
}
