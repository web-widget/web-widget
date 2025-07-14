import { useEffect, useState } from 'react';
import styles from './BaseLayout.module.css';

interface NavigationProps {
  className?: string;
}

export default function Navigation({ className }: NavigationProps) {
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    // 获取当前路径
    const path = window.location.pathname;
    setCurrentPath(path);

    // 监听路径变化（用于客户端路由）
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    // 监听点击事件来更新当前路径（用于同页面导航）
    const handleClick = (e: Event) => {
      const target = e.target as HTMLAnchorElement;
      if (target.tagName === 'A' && target.href && !target.target) {
        // 延迟更新，让导航完成
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

  // 导航配置数据
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

  // 检查是否为活跃链接
  const isActiveLink = (matchPath: string) => {
    if (matchPath === '/examples') {
      return currentPath === '/examples' || currentPath === '/';
    }
    return currentPath.startsWith(matchPath) && matchPath !== '/';
  };

  return (
    <nav className={className}>
      <ul>
        {navigationItems.map((item) => (
          <li key={item.matchPath}>
            <a
              href={item.href}
              className={isActiveLink(item.matchPath) ? styles.active : ''}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
