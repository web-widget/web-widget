import { useState, Suspense, createElement, lazy } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

import ReactCounter from "./Counter@widget.tsx";
import VueCounter from "../vue/Counter@widget.vue?as=jsx";
import VanillaCounter from "../vanilla/Counter@widget.ts";

const l = lazy<any>(async () => {
  console.log(999);
  return {
    default: (props) =>
      createElement("div", {
        dangerouslySetInnerHTML: {
          __html: JSON.stringify(props),
        },
      }),
  };
});

const Lazy = (props) => createElement(l, props);

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
        <ReactCounter name="React Counter" start={3} />

        <h2>Vue3 component:</h2>
        <VueCounter name="Vue3 Counter" start={3} />

        <h2>Vanilla component:</h2>
        <VanillaCounter name="Vanilla Counter" start={3} />
      </div>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </Suspense>
  );
}

export default App;
