import "../css/base-layout.css";

import type { ComponentProps } from "react";
import Menu from "../widgets/Menu.vue";

export default function BaseLayout({ children }: ComponentProps<any>) {
  return (
    <>
      <div className="container">
        <aside>
          <Menu renderStage="server" />
        </aside>
        <main>{children}</main>
      </div>
    </>
  );
}
