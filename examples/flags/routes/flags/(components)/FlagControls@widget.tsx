import styles from './FlagControls.module.css';

interface FlagControlsProps {
  flagName: string;
  cookieName: string;
  trueLabel?: string;
  falseLabel?: string;
  clearLabel?: string;
}

export default function FlagControls({
  flagName,
  cookieName,
  trueLabel = 'Act as flagged in user',
  falseLabel = 'Act as a regular user',
  clearLabel = 'Clear cookie',
}: FlagControlsProps) {
  const setCookie = (value: string) => {
    document.cookie = `${cookieName}=${value}; Path=/`;
    window.location.reload();
  };

  const clearCookie = () => {
    document.cookie = `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    window.location.reload();
  };

  return (
    <div className={styles.controls}>
      <p className={styles.controlsTitle}>Test this feature flag:</p>
      <div className={styles.buttons}>
        <button className={styles.button} onClick={() => setCookie('true')}>
          {trueLabel}
        </button>
        <button className={styles.button} onClick={() => setCookie('false')}>
          {falseLabel}
        </button>
        <button
          className={styles.button + ' ' + styles.buttonSecondary}
          onClick={() => clearCookie()}>
          {clearLabel}
        </button>
      </div>
    </div>
  );
}
