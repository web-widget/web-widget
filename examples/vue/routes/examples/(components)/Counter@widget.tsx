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

    // Add count change animation
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
        aria-label="Decrease count">
        <span>−</span>
      </button>

      <span
        ref={countRef}
        className={styles.count}
        aria-label={`Current count: ${count}`}>
        {count}
      </span>

      <button
        className={styles.button}
        onClick={() => handleCountChange(count + 1)}
        aria-label="Increase count">
        <span>+</span>
      </button>
    </div>
  );
}
