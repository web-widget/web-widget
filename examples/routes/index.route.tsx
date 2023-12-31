import styles from "./_css/index.module.css";
import BaseLayout from "./_components/BaseLayout";

export const meta = {
  title: "Hello, Web Widget",
};

export default function Home() {
  return (
    <BaseLayout>
      <h1 className={styles.title}>Home</h1>
      <p>
        Welcome to @web-widget/web-router. Try to update this message in the
        ./routes/index.route.tsx file, and refresh.
      </p>
    </BaseLayout>
  );
}
