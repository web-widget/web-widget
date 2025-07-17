import { useState } from 'react';
import { echo } from './functions@action';
import styles from './Echo.module.css';

export default function EchoWidget() {
  const [log, setLog] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim()) return;

    setIsLoading(true);
    try {
      // NOTE: This is a client-side call to the server-side function
      const value = await echo(inputValue);
      setLog(JSON.stringify(value, null, 2));
      setLastRequestTime(new Date().toLocaleString());

      // Add success animation effect
      const resultElement = document.querySelector(`.${styles.result}`);
      if (resultElement) {
        resultElement.classList.add(styles.success);
        setTimeout(() => {
          resultElement.classList.remove(styles.success);
        }, 600);
      }
    } catch (error) {
      console.error('Echo request failed:', error);
      setLog(JSON.stringify({ error: 'Request failed' }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.echoWidget}>
      <form onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          <label htmlFor="echo-input" className={styles.label}>
            💬 Enter Message
          </label>
          <div className={styles.inputContainer}>
            <input
              id="echo-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter any text, server will echo back the processed result..."
              className={styles.input}
              disabled={isLoading}
            />
            <button
              type="submit"
              className={styles.button}
              disabled={isLoading || !inputValue.trim()}>
              {isLoading ? (
                <>
                  <span className={styles.loading}></span>
                  Sending...
                </>
              ) : (
                <>📤 Send to Server</>
              )}
            </button>
          </div>
        </div>
      </form>

      {log && (
        <div className={styles.resultSection}>
          <div className={styles.resultHeader}>
            <span className={styles.resultIcon}>📋</span>
            <h4 className={styles.resultTitle}>Server Response</h4>
          </div>
          <p className={styles.description}>
            Below is the complete data returned after processing by the
            server-side function. You can view the actual network request in the
            Network panel of your browser's developer tools.
          </p>
          <div className={styles.result}>
            <pre className={styles.resultCode}>{log}</pre>
            {lastRequestTime && (
              <div className={styles.timestamp}>
                Request time: {lastRequestTime}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
