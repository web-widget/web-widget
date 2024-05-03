# 开发 >> React 适配 || 60

```js
import { App } from './App.tsx';
import ReactDOM from 'react-dom';

export default () => {
  let vdom;
  return {
    async mount({ container, data }) {
      if (ReactDOM.createRoot) {
        vdom = ReactDOM.createRoot(container);
        vdom.render(<App />);
      } else {
        // React < 18
        ReactDOM.render(<App />, container);
      }
    },

    async unmount() {
      if (vdom && vdom.unmount) {
        vdom.unmount();
      } else {
        // React < 18
        ReactDOM.unmountComponentAtNode(container);
      }
      vdom = null;
    },
  };
};
```
