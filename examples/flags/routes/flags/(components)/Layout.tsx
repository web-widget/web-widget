import type { ComponentProps } from 'react';
import styles from './Layout.module.css';

export default function Layout({ children }: ComponentProps<any>) {
  return (
    <>
      <header className={styles.header}>
        <nav>
          <ul>
            <li>
              <a href="/flags">Flags Examples</a>
            </li>
            <li>
              <a href="/flags/dashboard-pages">Dashboard Pages</a>
            </li>
            <li>
              <a href="/flags/marketing-pages-manual-approach">
                Marketing Manual
              </a>
            </li>
            <li>
              <a href="/flags/marketing-pages">Marketing Pages</a>
            </li>
          </ul>
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <p>
          See{' '}
          <a
            href="https://flags-sdk.dev"
            target="_blank"
            rel="noopener noreferrer">
            flags-sdk.dev
          </a>{' '}
          for the full documentation
        </p>
      </footer>
    </>
  );
}
