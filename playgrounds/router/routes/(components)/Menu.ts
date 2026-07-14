import { html } from '@web-widget/html';
import { navigation } from './catalog';

export default function Menu() {
  return html`<ul class="menu">
    <li class="menu-home"><a href="/">🏠 Home</a></li>
    ${navigation.map(
      (group) => html`
        <li class="menu-category">${group.name}</li>
        ${group.items.map(
          (item) => html`
            <li>
              <a
                href="${item.href}"
                target="${item.external ? '_blank' : undefined}"
                >${item.title}</a
              >
            </li>
          `
        )}
      `
    )}
  </ul>`;
}
