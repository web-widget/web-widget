import { useState } from "react";
export { render } from '@web-widget/react';

interface CounterProps {
  name: string;
  start: number;
}

export default function Counter(props: CounterProps) {
  const [count, setCount] = useState(props.start);
  return (
    <div>
      <h3>{props.name}</h3>
      <p>{count}</p>
      <button onClick={() => setCount(count - 1)}>
        -1
      </button>
      <button onClick={() => setCount(count + 1)}>
        +1
      </button>
    </div>
  );
}
