export { render } from "@web-widget/react";

export type WaitProps = { timeout: number };

export default (async function Wait({ timeout }: WaitProps) {
  await new Promise((resolve) => setTimeout(resolve, timeout));
  return (
    <>
      <p>Wait: {timeout}ms</p>
    </>
  );
} as unknown as React.FunctionComponent<any>);
