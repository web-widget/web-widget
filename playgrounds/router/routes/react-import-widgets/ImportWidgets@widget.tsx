import ReactCounter from '../(components)/Counter@widget';
import VueCounter from '@playgrounds/web-router-vue3/Counter@widget.vue?as=jsx';
import Vue2Counter from '@playgrounds/web-router-vue2/Counter@widget.vue?as=jsx';
import VanillaCounter from '../(components)/VanillaCounter@widget?as=jsx';

export default function Page() {
  return (
    <div>
      <h2>React component:</h2>
      <ReactCounter count={3} />

      <h2>Vue3 component:</h2>
      <VueCounter count={3} />

      <h2>Vue2 component:</h2>
      <Vue2Counter count={3} />

      <h2>Vanilla component:</h2>
      <VanillaCounter count={3} />
    </div>
  );
}
