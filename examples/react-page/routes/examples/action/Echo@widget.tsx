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

      // 添加成功动画效果
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
            💬 输入消息
          </label>
          <div className={styles.inputContainer}>
            <input
              id="echo-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="输入任何文本，服务器将回显处理结果..."
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
                  发送中...
                </>
              ) : (
                <>📤 发送到服务器</>
              )}
            </button>
          </div>
        </div>
      </form>

      {log && (
        <div className={styles.resultSection}>
          <div className={styles.resultHeader}>
            <span className={styles.resultIcon}>📋</span>
            <h4 className={styles.resultTitle}>服务器响应</h4>
          </div>
          <p className={styles.description}>
            以下是服务器端函数处理后返回的完整数据。你可以在浏览器开发者工具的
            Network 面板中查看实际的网络请求。
          </p>
          <div className={styles.result}>
            <pre className={styles.resultCode}>{log}</pre>
            {lastRequestTime && (
              <div className={styles.timestamp}>
                请求时间: {lastRequestTime}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
