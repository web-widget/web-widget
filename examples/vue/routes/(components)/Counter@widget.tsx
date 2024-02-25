import { useState } from 'react';
import styles from './Counter.module.css';

interface CounterProps {
  count: number;
}

export default function Counter(props: CounterProps) {
  const [count, setCount] = useState(props.count);
  return (
    <div className={styles.counter}>
      <button onClick={() => setCount(count - 1)}>−</button>
      <span className={styles.count}>{count}</span>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
}
