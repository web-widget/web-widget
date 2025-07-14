import type { ComponentProps } from 'react';
import './global.css';
import styles from './BaseLayout.module.css';
import ThemeToggle from './ThemeToggle@widget.tsx';
import Navigation from './Navigation@widget.tsx';

export default function BaseLayout({ children }: ComponentProps<any>) {
  return (
    <>
      {/* 主题初始化脚本 - 防止主题闪烁 */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              function getStoredTheme() {
                try { return localStorage.getItem('theme'); } catch (e) { return null; }
              }
              function getSystemTheme() {
                try { 
                  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                } catch (e) { return 'light'; }
              }
              function applyTheme(theme, isManual) {
                const html = document.documentElement;
                html.classList.remove('theme-dark', 'theme-light');
                
                if (isManual) {
                  // 手动设置的主题，添加类覆盖系统偏好
                  html.classList.add('theme-' + theme);
                }
                // 如果不是手动设置，不添加类，让CSS媒体查询生效
                
                html.setAttribute('data-theme', theme);
                html.style.colorScheme = theme;
              }
              
              const storedTheme = getStoredTheme();
              if (storedTheme === 'light' || storedTheme === 'dark') {
                // 有手动设置，使用手动设置
                applyTheme(storedTheme, true);
              } else {
                // 没有手动设置，跟随系统
                applyTheme(getSystemTheme(), false);
              }
            })();
          `,
        }}
      />
      <ThemeToggle />
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.brandLogo}>
            <a className={styles.brandText} href="/">
              Web Widget
            </a>
            <div className={styles.techStackBadge}>
              <span className={styles.reactIcon}>⚛️</span>
              <span className={styles.techText}>for React</span>
            </div>
          </div>
          <Navigation />
        </div>
      </header>
      <main className={styles.main}>{children}</main>
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
