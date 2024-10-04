import './counter-common.css';
import { useState } from 'react';

interface CounterProps {
  count: number;
}

export default function Counter(props: CounterProps) {
  const [count, setCount] = useState(props.count);
  return (
    <div className="counter">
      <button onClick={() => setCount(count - 1)}>-1</button>
      <span className="count">{count}</span>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
