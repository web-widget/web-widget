import ReactCounter from "../islands/Counter.tsx";
import VueCounter from "../islands/Counter.vue";
import { render } from "@web-widget/react";

export { render }

export default function Home() {
  return (
    <div>
      <p>
        Welcome to widget web server. Try to update this message in the ./routes/index.tsx
        file, and refresh.
      </p>
      <ReactCounter widget name="React Counter" start={3} />
      {/* <VueCounter widget name="Vue Counter" start={3} /> */}
    </div>
  );
}
