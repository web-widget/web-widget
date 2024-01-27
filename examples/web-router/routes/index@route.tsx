import { defineRouteComponent, defineMeta } from "@web-widget/react";
import styles from "./(css)/index.module.css";
import BaseLayout from "./(components)/BaseLayout";

export const meta = defineMeta({
  title: "Hello, Web Widget",
});

export default defineRouteComponent(function Home() {
  return (
    <BaseLayout>
      <h1 className={styles.title}>Home</h1>
      <p>
        Welcome to @web-widget/web-router. Try to update this message in the
        ./routes/index@route.tsx file, and refresh.
      </p>
    </BaseLayout>
  );
});
