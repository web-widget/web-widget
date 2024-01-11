import "./base-layout.css";

import type { ComponentProps } from "react";
import Menu from "@examples/web-router-vue3/Menu@widget.vue?as=jsx";

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
