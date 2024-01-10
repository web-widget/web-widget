import "./counter-common.css";
import type { WidgetRenderContext } from "@web-widget/schema";

export const render = (context: WidgetRenderContext) => {
  if (import.meta.env.SSR) {
    return context.module.default(context.data);
  } else {
    const container = Reflect.get(context, "container") as HTMLElement;

    if (!Reflect.get(context, "recovering")) {
      container.innerHTML = context.module.default(context.data);
    }

    const root = container.querySelector("[data-root]") as HTMLElement;
    const count = container.querySelector("[data-count]") as HTMLElement;

    root.onclick = (event) => {
      const target = event.target as HTMLElement;
      const action = target.dataset.action;
      if (action) {
        if (action === "+") {
          count.textContent = String(Number(count.textContent) + 1);
        } else if (action === "-") {
          count.textContent = String(Number(count.textContent) - 1);
        }
      }
    };
  }
};

interface CounterProps {
  name: string;
  start: number;
}

function compressHTML(html: string) {
  // 去除注释
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  // 去除多余空白
  html = html.replace(/\s+/g, " ");
  // 去除标签之间空格
  html = html.replace(/>\s+</g, "><");
  return html.trim();
}

export default function CounterVanilla(props: CounterProps) {
  return compressHTML(`
  <div class="counter" data-root>
    <button data-action="-">-1</button>
    <span class="count" data-count>${props.start}</span>
    <button data-action="+">+1</button>
  </div>`);
}
