import { useState } from 'react';
import styles from '~/styles/counter.module.css';

export default function ReactCounter({ count: initialCount = 0 }) {
  const [count, setCount] = useState(initialCount);
  return (
    <button className={styles.button} onClick={() => setCount(count + 1)}>
      React count is {count}
    </button>
  );
}
