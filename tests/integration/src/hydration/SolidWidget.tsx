import { createSignal } from 'solid-js';

export default function SolidWidget() {
  const [count, setCount] = createSignal(0);
  return (
    <div data-mount-root="solid">
      <span data-hydration-probe="solid">Solid {count()}</span>
      <button
        data-hydration-increment="solid"
        type="button"
        onClick={() => setCount((value) => value + 1)}>
        Increment
      </button>
    </div>
  );
}
