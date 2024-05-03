# 应用容器 >> 事件 || 2

## update

当应用内部更新数据后，会触发 `update` 事件。

```js
const widget = document.createElement('web-widget');
widget.application = () => {
  async mount({ container }) {
    const button = document.createElement('button');
    button.innerHTML = 'Click me';
    button.onclick = () => container.update({ data: { a: '1'} });
    container.appendChild(button);
  }
};
widget.addEventListener('update', (event) => {
  console.log('Update', event.value);
  if (!event.value.a) {
    event.preventDefault();
  }
});
document.body.appendChild(widget);
```

`update` 事件可通过 `event.preventDefault()` 阻止。

## statechange

当应用的状态变更后，每次都将触发 `statechange` 事件。

```js
const widget = document.createElement('web-widget');
widget.src = './app.widget.js';
widget.addEventListener('statechange', () => {
  console.log('State', widget.state);
});
document.body.appendChild(widget);
```
