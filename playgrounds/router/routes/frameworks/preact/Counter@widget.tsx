/** @jsxImportSource preact */
import { useState } from 'preact/hooks';
import styles from '~/routes/(css)/counter.module.css';

export default function Counter({
  count: initialCount = 0,
}: {
  count?: number;
}) {
  const [count, setCount] = useState(initialCount);
  return (
    <button className={styles.button} onClick={() => setCount(count + 1)}>
      Preact count is {count}
    </button>
  );
}
