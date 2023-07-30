import type { ComponentProps } from "react";
import Menu from "./Menu";
import "../css/base-layout.css";

export default function BaseLayout({ children }: ComponentProps<any>) {
  return (
    <>
      <div className="container">
        <aside>
          <Menu />
        </aside>
        <main>{children}</main>
      </div>
    </>
  );
}
