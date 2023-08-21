import BaseLayout from "../components/BaseLayout";
import WaitDemo from "../widgets/Wait";

const Loading = (
  <div style={{ background: "#f3f3f3", padding: "20px" }}>Loading..</div>
);

export default async function Page() {
  const tips = import.meta.env.DEV ? (
    <p style={{ background: "yellow" }}>
      💡 This example needs to run `pnpm start`
    </p>
  ) : (
    <></>
  );
  return (
    <BaseLayout>
      <h1>Streaming</h1>
      {tips}
      <WaitDemo fallback={Loading} id="demo:0" />
      <hr />
      <WaitDemo fallback={Loading} id="demo:1" />
      <hr />
      <WaitDemo fallback={Loading} id="demo:2" />
      <footer>
        <hr />
        <p>Footer</p>
      </footer>
    </BaseLayout>
  );
}
