export { render } from "@web-widget/react";

export type WaitProps = { timeout: number };

const fetchData = async (timeout: number) =>
  await new Promise((resolve) =>
    setTimeout(() => resolve(`Wait: ${timeout}ms`), timeout)
  );

export default (async function Wait({ timeout }: WaitProps) {
  const data = (await fetchData(timeout)) as string;
  return (
    <>
      <p>{data}</p>
    </>
  );
} as unknown as React.FunctionComponent<any>);
