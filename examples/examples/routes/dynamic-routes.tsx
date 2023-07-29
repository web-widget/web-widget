import type { RouteComponentProps } from "@web-widget/react";
export { render } from "@web-widget/react";

export default function Page(props: RouteComponentProps) {
  const { name } = props.params;
  return (
    <>
      <h1>Dynamic routes</h1>
      <p>Greetings to you, {JSON.stringify(name)}!</p>
    </>
  );
}
