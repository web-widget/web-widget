import "../css/base-layout.css";

import type { ComponentProps } from "react";
// import Menu from "./Menu";
import Menu from "../widgets/Menu";

export default function BaseLayout({ children }: ComponentProps<any>) {
  return (
    <>
      <div className="container">
        <aside>
          <Menu client />
        </aside>
        <main>{children}</main>
      </div>
    </>
  );
}
