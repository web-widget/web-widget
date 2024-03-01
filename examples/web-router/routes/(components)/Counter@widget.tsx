import './counter-common.css';
import { useState } from 'react';
import { useParams } from '@web-widget/helpers/navigation';

interface CounterProps {
  name: string;
  start: number;
}

export default function Counter(props: CounterProps) {
  const [count, setCount] = useState(props.start);
  console.log('useParams', useParams());
  return (
    <div className="counter">
      <button onClick={() => setCount(count - 1)}>-1</button>
      <span className="count">{count}</span>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
