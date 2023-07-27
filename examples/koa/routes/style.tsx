import { render } from "@web-widget/react";
import "../css/style.css";
import icon from "../public/favicon.svg";

export { render };

export default function StylePage() {
  return (
    <>
      <div className="box"></div>
      <div>
        <a href={icon}>link</a>
      </div>
    </>
  );
}
