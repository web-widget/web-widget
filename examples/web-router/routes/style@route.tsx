import "./(css)/style.css";
import BaseLayout from "./(components)/BaseLayout";

export default function Page() {
  return (
    <BaseLayout>
      <h1>Styling</h1>
      <div className="box"></div>
    </BaseLayout>
  );
}
