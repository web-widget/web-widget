import { render } from "@web-widget/react";
import "../css/style.css";

export { render };

export default function Page() {
  return (
    <>
      <h1>Styling</h1>
      <div className="box"></div>
    </>
  );
}
