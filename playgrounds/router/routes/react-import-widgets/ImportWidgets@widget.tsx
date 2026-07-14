import { container } from '@web-widget/react/adapter';
import ReactCounter from '../(components)/Counter@widget';
import { useState } from 'react';

const RVueCounter = container(
  () => import('@playgrounds/web-router-vue3/Counter@widget.vue')
);
const RVue2Counter = container(
  () => import('@playgrounds/web-router-vue2/Counter@widget.vue')
);

export default function Page() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <section className="ds-section">
        <h2>React component</h2>
        <ReactCounter count={3} />
      </section>

      <section className="ds-section">
        <h2>Vue3 component</h2>
        <RVueCounter count={3} />
      </section>

      <section className="ds-section">
        <h2>Vue2 component</h2>
        <RVue2Counter count={3} />
      </section>

      <div>
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
    </div>
  );
}
