import type { ComponentProps } from 'react';
import './global.css';
import styles from './BaseLayout.module.css';

export default function BaseLayout({ children }: ComponentProps<any>) {
  return (
    <>
      <header className={styles.header}>
        <nav>
          <ul>
            <li>
              <a href="/">Home</a>
            </li>
            <li>
              <a href="/about">About</a>
            </li>
            <li>
              <a href="/fetch">Fetching data</a>
            </li>
            <li>
              <a href="/greet/web-widget">Dynamic routes</a>
            </li>
            <li>
              <a href="/action">Server actions</a>
            </li>
          </ul>
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <p>This is a footer</p>
      </footer>
    </>
  );
}
