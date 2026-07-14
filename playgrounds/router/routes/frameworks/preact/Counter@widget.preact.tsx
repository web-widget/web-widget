/** @jsxImportSource preact */
import { useState } from 'preact/hooks';

export default function Counter({
  count: initialCount = 0,
}: {
  count?: number;
}) {
  const [count, setCount] = useState(initialCount);
  return (
    <button onClick={() => setCount(count + 1)}>Preact count is {count}</button>
  );
}
