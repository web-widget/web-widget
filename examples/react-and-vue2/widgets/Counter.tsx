import "./counter-common.css";
import { useState } from "react";

interface CounterProps {
  name: string;
  start: number;
}

export default function Counter(props: CounterProps) {
  const [count, setCount] = useState(props.start);
  return (
    <div className="counter" title={props.name}>
      <button onClick={() => setCount(count - 1)}>-1</button>
      <span className="count">{count}</span>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
