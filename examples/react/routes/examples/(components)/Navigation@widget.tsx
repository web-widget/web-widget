import { useEffect, useState } from 'react';
import styles from './Navigation.module.css';

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
    { href: '/examples', label: 'Home', matchPath: '/examples' },
    {
      href: '/examples/static',
      label: 'Static Page',
      matchPath: '/examples/static',
    },
    {
      href: '/examples/params/web-widget',
      label: 'Dynamic Routing',
      matchPath: '/examples/params',
    },
    {
      href: '/examples/fetch',
      label: 'Data Fetching',
      matchPath: '/examples/fetch',
    },
    {
      href: '/examples/action',
      label: 'Server Actions',
      matchPath: '/examples/action',
    },
    {
      href: '/examples/frameworks',
      label: 'Widgets',
      matchPath: '/examples/frameworks',
    },
    {
      href: '/examples/middleware',
      label: 'Middleware',
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
    <nav
      className={`${styles.navigation} ${className || ''}`}
      aria-label="Main navigation"
      role="navigation">
      <button
        className={styles.mobileMenuButton}
        onClick={toggleMobileMenu}
        aria-expanded={isMobileMenuOpen}
        aria-controls="mobile-navigation-menu"
        aria-label={
          isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'
        }>
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
        {navigationItems.map((item) => (
          <li key={item.matchPath} role="listitem">
            <a
              href={item.href}
              className={isActiveLink(item.matchPath) ? styles.active : ''}
              aria-current={isActiveLink(item.matchPath) ? 'page' : undefined}
              aria-label={`${item.label}${isActiveLink(item.matchPath) ? ' (current page)' : ''}`}
              onClick={handleLinkClick}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>

      {/* Mobile menu background overlay */}
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
