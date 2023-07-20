import ReactCounter from "../widgets/Counter.tsx";
import VueCounter from "../widgets/CounterVue.ts";
import { render } from "@web-widget/react";
import styles from "./index.module.css";

export { render };

export default function Home() {
  return (
    <>
      <h1 className={styles.title}>Home</h1>
      <p>
        Welcome to @web-widget/web-server. Try to update this message in the
        ./routes/index.tsx file, and refresh.
      </p>
      <ReactCounter client name="React Counter" start={3} />
      <VueCounter client name="Vue3 Counter" start={1} />
    </>
  );
}
