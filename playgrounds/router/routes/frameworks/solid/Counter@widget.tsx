/** @jsxImportSource solid-js */
import { createSignal } from 'solid-js';
import styles from '~/routes/(css)/counter.module.css';

export default function Counter(props: { count?: number }) {
  const [count, setCount] = createSignal(props.count ?? 0);
  return (
    <button class={styles.button} onClick={() => setCount(count() + 1)}>
      Solid count is {count()}
    </button>
  );
}
