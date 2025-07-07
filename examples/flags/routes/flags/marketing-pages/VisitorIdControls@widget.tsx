import styles from '../(components)/FlagControls.module.css';

export default function VisitorIdControls() {
  const resetVisitorId = () => {
    // Use URL parameter to signal the server to reset the visitor ID
    // This works with HttpOnly cookies that can't be modified by JavaScript
    window.location.href = '/flags/marketing-pages?resetVisitorId=true';
  };

  return (
    <div className={styles.controls}>
      <p className={styles.controlsTitle}>Test different visitor IDs:</p>
      <div className={styles.buttons}>
        <button className={styles.button} onClick={resetVisitorId}>
          Reset visitor ID
        </button>
      </div>
      <p
        style={{
          fontSize: '0.875rem',
          color: '#64748b',
          marginTop: '0.75rem',
        }}>
        The visitor ID determines which combination of flags you see. Each ID
        produces a consistent set of flag values. Resetting will generate a new
        random visitor ID via middleware.
      </p>
    </div>
  );
}
