import { h } from 'preact';
import { useState } from 'preact/hooks';

export default function PreactWidget() {
  const [count, setCount] = useState(0);
  return h('div', { 'data-mount-root': 'preact' }, [
    h('span', { 'data-hydration-probe': 'preact' }, `Preact ${count}`),
    h(
      'button',
      {
        'data-hydration-increment': 'preact',
        type: 'button',
        onClick: () => setCount((value) => value + 1),
      },
      'Increment'
    ),
  ]);
}
