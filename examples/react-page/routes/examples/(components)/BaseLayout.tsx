import type { ComponentProps } from 'react';
import './global.css';
import styles from './BaseLayout.module.css';
import Navigation from './Navigation@widget.tsx';

export default function BaseLayout({ children }: ComponentProps<any>) {
  return (
    <>
      <a href="#main-content" className="skip-link">
        跳过导航，前往主内容
      </a>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.brandLogo}>
            <a className={styles.brandText} href="/">
              Web Widget
            </a>
            <div className={styles.techStackBadge}>
              <span className={styles.reactIcon}>⚛️</span>
              <span className={styles.techText}>React 示例</span>
            </div>
          </div>
          <Navigation />
        </div>
      </header>
      <main id="main-content" className={styles.main} tabIndex={-1}>
        {children}
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <h3 className={styles.footerBrandName}>Web Widget</h3>
            <p className={styles.footerTagline}>
              Simplicity is the ultimate sophistication
            </p>
          </div>

          <div className={styles.footerLinks}>
            <a
              href="https://github.com/web-widget/web-widget#readme"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerLink}>
              📚 文档
            </a>
            <a
              href="https://github.com/web-widget/web-widget"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerLink}>
              ⭐ GitHub
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
