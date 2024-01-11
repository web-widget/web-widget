import BaseLayout from "./(components)/BaseLayout.js";
import ReactWaitDemo from "./(components)/Wait@widget.js";
import VueWaitDemo from "@examples/web-router-vue3/Wait@widget.vue?as=tsx";

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
      <h1>React Route: Streaming</h1>
      {tips}
      <VueWaitDemo fallback={Loading} id="demo:0" />
      <hr />
      <VueWaitDemo fallback={Loading} id="demo:1" />
      <hr />
      <VueWaitDemo fallback={Loading} id="demo:2" />
      <hr />
      <ReactWaitDemo fallback={Loading} id="demo:3" />
      <hr />
      <ReactWaitDemo fallback={Loading} id="demo:4" />
      <hr />
      <ReactWaitDemo fallback={Loading} id="demo:5" />
    </BaseLayout>
  );
}
