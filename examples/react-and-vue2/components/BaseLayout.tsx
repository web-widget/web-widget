import "../css/base-layout.css";

import type { ComponentProps } from "react";
import Menu from "../widgets/Menu.vue";

export default function BaseLayout({ children }: ComponentProps<any>) {
  return (
    <>
      <header>
        <h1>Web Router Examples</h1>
      </header>
      <div className="container">
        <aside>
          <Menu renderStage="server" />
        </aside>
        <main>{children}</main>
      </div>
      <footer>
        <p>This is a footer</p>
      </footer>
    </>
  );
}
