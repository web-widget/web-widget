import ReactCounter from "../islands/Counter.tsx";
import VueCounter from "../islands/CounterVue.ts";
import { render } from "@web-widget/react";
import "./index.css";

export { render };

export default function Home() {
  return (
    <div>
      <h1>Home</h1>
      <p>
        Welcome to widget web server. Try to update this message in the
        ./routes/index.tsx file, and refresh.
      </p>
      <ReactCounter widget name="React Counter" start={3} />
      <VueCounter widget name="Vue Counter" start={1} />
    </div>
  );
}
