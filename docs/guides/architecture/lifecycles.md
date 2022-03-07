# 容器化 >> 管理生命周期 || 40

```js script
import '@rocket/launch/inline-notification/inline-notification.js';
```

默认情况下 Web Widget 应用生命周期是和容器的 DOM 生命周期关联在一起。

* 容器插入到文档后，自动执行应用的挂载：load -\> bootstrap -\> mount
* 容器从文档销毁后，自动执行应用的移除：unmount -\> unload

```
      Start
        ▼
    ┌───┴──┐
    │ load │
    └───┬──┘
        ▼
  ┌─────┴─────┐
  │ bootstrap │
  └─────┬─────┘
┌──────►┤
│       ▼ 
│   ┌───┴───┐
│   │ mount │
│   └───┬───┘ 
│       │   ┌───────┐
│       │   │       ▼
│       ▼   ▲   ┌───┴────┐
│       ├───┤   │ update │
│       │   ▲   └───┬────┘
│       │   │       ▼                 
│       │   └───────┘
│       ▼
│  ┌────┴────┐
└─◄┤ unmount │
   └────┬────┘
        ▼ 
   ┌────┴───┐
   │ unload │
   └────┬───┘ 
        ▼
       End
```

大多数情况下你不需要手动的管理应用生命周期。

## 手动控制

Web Widget 容器提供了接口允许你手动控制应用的生命周期，这样可以和其他程序一起来管理应用，例如结合路由管理程序使用。

在容器上设置 `inactive` 属性，即可关闭与 DOM 生命周期的绑定，这时候可以通过容器[接口](../../docs/container/interfaces/html-web-widget-element.md)来手动控制应用的生命周期。

```html
<web-widget src="app.widget.js" inactive></web-widget>
```

## 手动预加载应用

应用的 `bootstrap` 生命周期函数被设计为用来下载一些应用挂载之前必要的资源，例如外部 CSS 文件、重要的背景图片等。

```js
const widget = document.querySelector('web-widget');

widget.bootstrap().then(() => {
  console.log('bootstrapped');
});
```

## 手动挂载应用

```js
const widget = document.querySelector('web-widget');

widget.mount().then(() => {
  console.log('mounted');
});
```

<inline-notification type="tip">

容器的 `mount()` 方法内部会自动执行 `load()` 与 `bootstrap()` 调用。

</inline-notification>

## 手动更新应用数据

详情见 [管理数据](data.md)

## 手动卸载应用

```js
const widget = document.querySelector('web-widget');

widget.unmount().then(() => {
  console.log('unmounted');
});
```

## 处理超时

默认情况下，Web Widget 容器允许应用有无限期的等待时长（除非浏览器加载资源超时），你可以为所有的 Web Widget 应用重新设置默认超时时间：

```js
HTMLWebWidgetElement.timeouts = {
  load: 12000,
  bootstrap: 4000,
  mount: 3000,
  update: 3000,
  unmount: 3000,
  unload: 3000
}
```