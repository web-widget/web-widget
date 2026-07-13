import ReactCounter from '../(components)/Counter@widget';
import VueCounter from '@playgrounds/web-router-vue3/Counter@widget.vue';
import Vue2Counter from '@playgrounds/web-router-vue2/Counter@widget.vue';
import { asReactWidget } from '@playgrounds/web-router-vue3/helpers';
import { asReactWidget as vue2AsReactWidget } from '@playgrounds/web-router-vue2/helpers';
import VanillaCounter from '../(components)/VanillaCounter@widget';
import { useState } from 'react';

const RVueCounter = asReactWidget(VueCounter);
const RVue2Counter = vue2AsReactWidget(Vue2Counter);

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

      <section className="ds-section">
        <h2>Vanilla component</h2>
        <VanillaCounter count={3} />
      </section>

      <div>
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
    </div>
  );
}
