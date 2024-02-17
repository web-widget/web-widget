import { useState } from 'react';
import styles from './Counter.module.css';

interface CounterProps {
  name: string;
  start: number;
}

export default function Counter(props: CounterProps) {
  const [count, setCount] = useState(props.start);
  return (
    <div className={styles.counter}>
      <button onClick={() => setCount(count - 1)}>−</button>
      <span className={styles.count}>{count}</span>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
}
