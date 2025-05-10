import './counter-common.css';
import { defineClientRender, defineServerRender } from '@web-widget/helpers';
import { IS_SERVER } from '@web-widget/helpers/env';

export const render = IS_SERVER
  ? defineServerRender<Function>((component, data) => {
      return component(data);
    })
  : defineClientRender<Function>(
      (component, data, { container, recovering }) => {
        if (!recovering) {
          (container as HTMLElement).innerHTML = component(data);
        }

        const root = container.querySelector('[data-root]') as HTMLElement;
        const count = container.querySelector('[data-count]') as HTMLElement;

        root.onclick = (event) => {
          const target = event.target as HTMLElement;
          const action = target.dataset.action;
          if (action) {
            if (action === '+') {
              count.textContent = String(Number(count.textContent) + 1);
            } else if (action === '−') {
              count.textContent = String(Number(count.textContent) - 1);
            }
          }
        };
      }
    );

interface CounterProps {
  count: number;
}

function compressHTML(html: string) {
  // 去除注释
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  // 去除多余空白
  html = html.replace(/\s+/g, ' ');
  // 去除标签之间空格
  html = html.replace(/>\s+</g, '><');
  return html.trim();
}

export default function CounterVanilla(props: CounterProps) {
  return compressHTML(`
  <div class="counter" data-root>
    <button data-action="−">−</button>
    <span class="count" data-count>${props.count}</span>
    <button data-action="+">+</button>
  </div>`);
}
