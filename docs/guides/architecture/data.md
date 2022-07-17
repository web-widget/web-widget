# 容器化 >> 管理数据 || 40

```js script
import '@rocket/launch/inline-notification/inline-notification.js';
```

Web Widget 应用可以自己获取数据，也可以交给容器来获取数据——这完全取决于你的需要：

* 对于小天气挂件这样的应用，通常由应用自己去获取天气数据
* 如果应用由可视化编辑器进行可选项设置，那么需要统一的存储这些数据，这通常交给容器来管理数据
* 如果想通过 SSR 方式渲染应用，数据要尽可能的提前准备好，这通常应该由容器来管理数据

Web Widget 应用程序就是普通的 JavaScript 代码，因此可以使用浏览器提供的诸如 `fetch` 或者 `XMLHttpRequest` 等方法来获取应用数据，而本文重点是描述如何通过容器管理应用数据。

## 通过容器获取数据

通过 `data` 或 `data-*` 属性可以为 Web Widget 应用传递静态的数据：

```html
<web-widget
  src="app.widget.js"
  data-username="web-widget"
  data-email="web-widget@web-widget.js.org">
</web-widget>
```

Web Widget 应用可以通过生命周期函数获的 `data` 参数获取到数据。

```js
// app.widget.js
export default () => ({
  async mount({ data }) {
    console.log(data);
  }
});
```

<inline-notification type="tip">

通过 `data-*` 只能传递 `string` 类型的值；使用 `data` 属性可以使用 JSON 字符串，它将自动解析成 `object`。

</inline-notification>

## 手动更新应用的数据

当应用挂载成功后，后续如果想要更新数据，可以执行容器上的 `update({ data })` 来触发应用同名的生命周期函数，以便应用自行处理更新后的数据。

```html
<web-widget src="app.widget.js" data="{}"></web-widget>

<script type="module">
  import { HTMLWebWidgetElement } from '@web-widget/container';

  const webWidgetElement = document.querySelector('web-widget');
  webWidgetElement.mount().then(() => {
    webWidgetElement.update({
      data: {/*...*/}
    });
  });
</script>
```

## 应用内部自更新数据

应用也可以自己更新数据，通过 `container.update({ data })` 更新数据，这样容器可以观察到数据的变化，进而启动一些数据处理的流程。

```js
// app.widget.js
export default () => ({
  async mount({ data, container }) {
    // ...
    element.onclick = () => {
      container.update({ data });
    }

    container.appendChild(element);
  }
});
```

## 观察数据变化

```js
const { INITIAL, UPDATING, MOUNTED } = HTMLWebWidgetElement;
let oldState = INITIAL;
webWidgetElement.addEventListener('statechange', function() {
  if (oldState === UPDATING && this.state === MOUNTED) {
    console.log('data update', this.data);
  }
  oldState = this.state;
});
```