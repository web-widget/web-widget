import "./counter-common.css";
import type { WidgetRenderContext } from "@web-widget/schema";

export const render = (context: WidgetRenderContext) => {
  if (import.meta.env.SSR) {
    return context.module.default(context.data);
  } else if (Reflect.get(context, "recovering")) {
    const container = Reflect.get(context, "container") as HTMLElement;
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

export default function CounterVanilla(props: CounterProps) {
  if (import.meta.env.SSR) {
    return `
    <div class="counter" data-root title="${props.name}">
      <button data-action="-">-1</button>
      <button class="count" data-count>${props.start}</button>
      <button data-action="+">+1</button>
    </div>`;
  }
}
