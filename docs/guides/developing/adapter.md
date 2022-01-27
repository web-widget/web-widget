# 应用开发 >> 框架适配 || 21

## React

```js
import { App } from './App';
import ReactDOM from 'react-dom';

export default () => {
  let vdom;
  let appElement;
  return {
    async mount({ container, data }) {
      appElement = document.createElement('div');
      container.appendChild(appElement);

      vdom = ReactDOM.render(
        <App />,
        appElement,
      );
    },

    async unmount() {
      if (vdom.unmount) {
        // React >= 18
        vdom.unmount();
      } else {
        // React < 18
        ReactDOM.unmountComponentAtNode(appElement);
      }
    },
  };
};
```

