import { useState, useRef } from 'react';
import styles from './Counter.module.css';

interface CounterProps {
  count: number;
  variant?: 'react' | 'vue';
}

export default function Counter({
  count: initialCount,
  variant = 'react',
}: CounterProps) {
  const [count, setCount] = useState(initialCount);
  const countRef = useRef<HTMLSpanElement>(null);

  const handleCountChange = (newCount: number) => {
    setCount(newCount);

    // 添加计数变化动画
    if (countRef.current) {
      countRef.current.classList.remove(styles.animate);
      setTimeout(() => {
        countRef.current?.classList.add(styles.animate);
      }, 10);
      setTimeout(() => {
        countRef.current?.classList.remove(styles.animate);
      }, 300);
    }
  };

  return (
    <div className={styles.counter} data-variant={variant}>
      <span className={styles.counterLabel}>
        {variant === 'react' ? 'React' : 'Vue'} Counter
      </span>

      <button
        className={styles.button}
        onClick={() => handleCountChange(count - 1)}
        aria-label="减少计数">
        −
      </button>

      <span
        ref={countRef}
        className={styles.count}
        aria-label={`当前计数: ${count}`}>
        {count}
      </span>

      <button
        className={styles.button}
        onClick={() => handleCountChange(count + 1)}
        aria-label="增加计数">
        +
      </button>
    </div>
  );
}
