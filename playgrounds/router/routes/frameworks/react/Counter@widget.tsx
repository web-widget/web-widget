import { useState } from 'react';

export default function Counter({
  count: initialCount = 0,
}: {
  count?: number;
}) {
  const [count, setCount] = useState(initialCount);
  return (
    <button onClick={() => setCount(count + 1)}>React count is {count}</button>
  );
}
