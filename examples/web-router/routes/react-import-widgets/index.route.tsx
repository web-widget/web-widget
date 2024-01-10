import BaseLayout from "../(components)/BaseLayout.tsx";
import ImportWidgetsWidget from "./ImportWidgets@widget.tsx";

export default function Page() {
  return (
    <BaseLayout>
      <h1>React: Import Widgets</h1>
      <ImportWidgetsWidget />
    </BaseLayout>
  );
}
