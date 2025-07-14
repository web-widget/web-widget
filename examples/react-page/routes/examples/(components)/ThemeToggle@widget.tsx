import { useState, useEffect } from 'react';
import styles from './ThemeToggle.module.css';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // 检查是否有手动设置的主题
    const stored = localStorage.getItem('theme');

    if (stored === 'light' || stored === 'dark') {
      // 有手动设置，使用手动设置
      const isDarkTheme = stored === 'dark';
      setIsDark(isDarkTheme);
      applyTheme(isDarkTheme);
    } else {
      // 没有手动设置，跟随系统主题但不保存到localStorage
      const systemIsDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      setIsDark(systemIsDark);
      applySystemTheme(systemIsDark);

      // 监听系统主题变化（仅在没有手动设置时）
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        // 只有在没有手动设置时才跟随系统
        if (!localStorage.getItem('theme')) {
          setIsDark(e.matches);
          applySystemTheme(e.matches);
        }
      };

      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () =>
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
  }, []);

  const applyTheme = (dark: boolean) => {
    const html = document.documentElement;

    // 移除所有主题类
    html.classList.remove('theme-dark', 'theme-light');

    // 添加手动主题类（覆盖系统偏好）
    const theme = dark ? 'dark' : 'light';
    html.classList.add(`theme-${theme}`);
    html.setAttribute('data-theme', theme);
    html.style.colorScheme = theme;
  };

  const applySystemTheme = (dark: boolean) => {
    const html = document.documentElement;

    // 移除所有手动主题类，让系统偏好生效
    html.classList.remove('theme-dark', 'theme-light');

    const theme = dark ? 'dark' : 'light';
    html.setAttribute('data-theme', theme);
    html.style.colorScheme = theme;
  };

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    // 一旦用户手动切换，就保存到localStorage并覆盖系统偏好
    const theme = newIsDark ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    applyTheme(newIsDark);
  };

  return (
    <button
      className={styles.themeToggle}
      onClick={toggleTheme}
      title={isDark ? '切换到明亮主题' : '切换到暗黑主题'}
      aria-label={isDark ? '切换到明亮主题' : '切换到暗黑主题'}>
      <span className={styles.icon}>{isDark ? '☀️' : '🌙'}</span>
    </button>
  );
}
