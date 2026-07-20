import { html, type HTML } from '@web-widget/html';
import { widget } from '@web-widget/html/adapter';
import './global.css';
import styles from './baseLayout.module.css';

const navigation = widget(() => import('./Navigation@widget.tsx'));

export function baseLayout(content: HTML) {
  return html`
    <a href="#main-content" class="skip-link">
      Skip navigation, go to main content
    </a>
    <header class="${styles.header}">
      <div class="${styles.headerContent}">
        <div class="${styles.brandLogo}">
          <a class="${styles.brandText}" href="/"> Web Widget </a>
          <div class="${styles.techStackBadge}">
            <span class="${styles.techText}">HTML Example</span>
          </div>
        </div>
        ${navigation()}
      </div>
    </header>
    <main id="main-content" class="${styles.main}" tabindex="-1">
      ${content}
    </main>
    <footer class="${styles.footer}">
      <div class="${styles.footerContent}">
        <div class="${styles.footerBrand}">
          <h3 class="${styles.footerBrandName}">Web Widget</h3>
          <p class="${styles.footerTagline}">
            Simplicity is the ultimate sophistication
          </p>
        </div>
        <div class="${styles.footerLinks}">
          <a
            href="https://github.com/web-widget/web-widget#readme"
            target="_blank"
            rel="noopener noreferrer"
            class="${styles.footerLink}">
            📚 Documentation
          </a>
          <a
            href="https://github.com/web-widget/web-widget"
            target="_blank"
            rel="noopener noreferrer"
            class="${styles.footerLink}">
            ⭐ GitHub
          </a>
        </div>
      </div>
    </footer>
  `;
}
