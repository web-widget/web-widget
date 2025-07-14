import { useEffect, useState } from 'react';
import styles from './BaseLayout.module.css';

interface NavigationProps {
  className?: string;
}

export default function Navigation({ className }: NavigationProps) {
  const [currentPath, setCurrentPath] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    setCurrentPath(path);

    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    const handleClick = (e: Event) => {
      const target = e.target as HTMLAnchorElement;
      if (target.tagName === 'A' && target.href && !target.target) {
        setTimeout(() => {
          setCurrentPath(window.location.pathname);
        }, 50);
      }
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  const navigationItems = [
    { href: '/examples', label: '首页', matchPath: '/examples' },
    {
      href: '/examples/static',
      label: '静态页面',
      matchPath: '/examples/static',
    },
    {
      href: '/examples/params/web-widget',
      label: '动态路由',
      matchPath: '/examples/params',
    },
    {
      href: '/examples/fetch',
      label: '数据获取',
      matchPath: '/examples/fetch',
    },
    {
      href: '/examples/action',
      label: '服务器操作',
      matchPath: '/examples/action',
    },
    {
      href: '/examples/frameworks',
      label: '多框架共存',
      matchPath: '/examples/frameworks',
    },
    {
      href: '/examples/middleware',
      label: '中间件',
      matchPath: '/examples/middleware',
    },
  ];

  const isActiveLink = (matchPath: string) => {
    if (matchPath === '/examples') {
      return currentPath === '/examples' || currentPath === '/';
    }
    return currentPath.startsWith(matchPath) && matchPath !== '/';
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLinkClick = () => {
    closeMobileMenu();
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        closeMobileMenu();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  return (
    <nav className={className} aria-label="主导航" role="navigation">
      <button
        className={styles.mobileMenuButton}
        onClick={toggleMobileMenu}
        aria-expanded={isMobileMenuOpen}
        aria-controls="mobile-navigation-menu"
        aria-label={isMobileMenuOpen ? '关闭导航菜单' : '打开导航菜单'}>
        <span className={styles.hamburgerIcon}>
          <span
            className={`${styles.hamburgerLine} ${isMobileMenuOpen ? styles.hamburgerLineOpen : ''}`}></span>
          <span
            className={`${styles.hamburgerLine} ${isMobileMenuOpen ? styles.hamburgerLineOpen : ''}`}></span>
          <span
            className={`${styles.hamburgerLine} ${isMobileMenuOpen ? styles.hamburgerLineOpen : ''}`}></span>
        </span>
      </button>

      <ul
        id="mobile-navigation-menu"
        className={`${styles.navigationMenu} ${isMobileMenuOpen ? styles.navigationMenuOpen : ''}`}
        role="list"
        aria-hidden={!isMobileMenuOpen ? 'true' : 'false'}>
        <li className={styles.mobileMenuCloseWrapper} role="none">
          <button
            className={styles.mobileMenuCloseButton}
            onClick={closeMobileMenu}
            aria-label="关闭导航菜单"
            type="button">
            <span className={styles.closeIcon} aria-hidden="true">
              <span className={styles.closeIconLine}></span>
              <span className={styles.closeIconLine}></span>
            </span>
          </button>
        </li>

        {navigationItems.map((item) => (
          <li key={item.matchPath} role="listitem">
            <a
              href={item.href}
              className={isActiveLink(item.matchPath) ? styles.active : ''}
              aria-current={isActiveLink(item.matchPath) ? 'page' : undefined}
              aria-label={`${item.label}${isActiveLink(item.matchPath) ? ' (当前页面)' : ''}`}
              onClick={handleLinkClick}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>

      {/* 移动端菜单背景遮罩 */}
      {isMobileMenuOpen && (
        <div
          className={styles.mobileMenuOverlay}
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}
    </nav>
  );
}
