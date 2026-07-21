import { useState } from 'react';

export default function ReactWidget() {
  const [count, setCount] = useState(0);
  return (
    <div data-mount-root="react">
      <slot name="label" />
      <span
        className="hydration-probe react-probe shadow-boundary-probe"
        data-hydration-probe="react">
        React {count}
      </span>
      <button
        data-hydration-increment="react"
        type="button"
        onClick={() => setCount((value) => value + 1)}>
        Increment
      </button>
    </div>
  );
}
