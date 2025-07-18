import styles from './ErrorPage.module.css';

interface ErrorPageProps {
  /** Error page title */
  title?: string;
  /** Error page subtitle */
  subtitle?: string;
  /** Error message */
  message?: string;
  /** Custom icon */
  icon?: string;
}

export default function ErrorPage({
  title = 'Not Found',
  subtitle = 'Sorry, the page you are looking for does not exist or has been moved.',
  message,
  icon = '🔍',
}: ErrorPageProps) {
  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorIcon}>{icon}</div>
      <h1 className={styles.errorTitle}>{title}</h1>
      <p className={styles.errorSubtitle}>{subtitle}</p>
      {message && <div className={styles.errorMessage}>{message}</div>}
    </div>
  );
}
