import { render } from "@web-widget/react";
import styles from "../css/index.module.css";
import Menu from "../components/Menu";

export { render };

export const meta = {
  title: "Hello, Web Widget",
};

export default function Home() {
  return (
    <>
      <h1 className={styles.title}>Home</h1>
      <p>
        Welcome to @web-widget/web-server. Try to update this message in the
        ./routes/index.tsx file, and refresh.
      </p>
      <h2>Examples:</h2>
      <Menu />
    </>
  );
}
