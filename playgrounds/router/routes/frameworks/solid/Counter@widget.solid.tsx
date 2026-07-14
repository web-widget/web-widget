import { createSignal } from 'solid-js';

export default function Counter(props: { count?: number }) {
  const [count, setCount] = createSignal(props.count ?? 0);
  return (
    <button onClick={() => setCount(count() + 1)}>
      Solid count is {count()}
    </button>
  );
}
