import { render } from "@web-widget/react";
import styles from "../css/index.module.css";
import BaseLayout from "../components/BaseLayout";

export { render };

export const meta = {
  title: "Hello, Web Widget",
};

export default function Home() {
  return (
    <BaseLayout>
      <h1 className={styles.title}>Home</h1>
      <p>
        Welcome to @web-widget/web-router. Try to update this message in the
        ./routes/index.tsx file, and refresh.
      </p>
    </BaseLayout>
  );
}
