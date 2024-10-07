import { useState, Suspense } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

import VueCounter from '../vue3/Counter@widget.vue?as=jsx';
import Vue2Counter from '../vue2/Counter@widget.vue?as=jsx';
import ReactCounter from './Counter@widget';

function App() {
  const [count, setCount] = useState(0);

  return (
    <Suspense>
      <div>
        <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div>
        <h2>React component:</h2>
        <ReactCounter count={3} />

        <h2>Vue3 component:</h2>
        <VueCounter count={3} />

        <h2>Vue2 component:</h2>
        <Vue2Counter count={3} />
      </div>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
      <p>
        Edit <code>packages/react/App.tsx</code> and save to test HMR
      </p>
    </Suspense>
  );
}

export default App;
