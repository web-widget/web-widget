# WebWidget router

这是 WebWidget 的路由插件。

## 安装

```bash
npm install @web-sandbox.js/router --save
```

## 使用

```html
<web-widget name="home" src="/index.widget.js" inactive data-id="#43243242"></web-widget>
<web-widget name="news" src="/news.widget.js" inactive data-id="#ttrt"></web-widget>
<web-widget name="about" src="/about.widget.js" inactive data-id="#367" data-about="一个演示"></web-widget>
<web-widget name="vue-router" src="/vue-router.widget.js" inactive data-id="#367" data-vue="vue-router demo"></web-widget>
```

```js
import '@web-sandbox.js/web-widget';
import { collection, navigate, history } from  '@web-sandbox.js/router';

collection.add(
  document.querySelector('[name=home]'),
  location => location.pathname === '/'
);

collection.add(
  document.querySelector('[name=news]'),
  location => location.pathname.startsWith('/news')
);

collection.add(
  document.querySelector('[name=about]'),
  location => location.pathname.startsWith('/about')
);

collection.add(
  document.querySelector('[name=vue-router]'),
  location => location.pathname.startsWith('/vue-router')
);

function reroute() {
  collection.change(location);
}

history.listen(reroute);
reroute();

window.navigate = navigate;
```

## API

WebWidget router 由三个领域 API 组合而成。

```js
import { collection, navigate, history } from  '@web-sandbox.js/router';
```

* [collection](#collection) 应用集合管理器
* [history](#history) 历史记录对象
* [navigate](#navigate) 导航器

## collection

管理应用集合。

### add

注册应用。

```js
collection.add(webWidgetElement, activeWhen);
```

#### 参数

* `webWidgetElement`: `HTMLWebWidgetElement` 元素实例
* `activeWhen`: 应用活动状态回调函数，每次路由变更的时候（[change](#change)）它都会触发。它接收 `location` 参数，通过返回值告诉 collection 是否挂载或卸载应用

### delete

移除注册的应用。

```js
collection.delete(webWidgetElement);
```

#### 参数

* `webWidgetElement`: `HTMLWebWidgetElement` 元素实例

### change

触发应用状态变更。

```js
collection.change(location);
```

#### 参数

* `location`: 即 `window.location`

### catch

应用发生异常后的回调用函数。它的默认行为是向异步向全局抛出异常，这样 `window.onerror` 监听器可以处理，而覆盖它可以实现自定义的错误监控。

```js
collection.catch = error => {
  // ...
};
```

## history

历史记录对象，来自 [history](https://www.npmjs.com/package/history)。历史对象可以使用以下方法以编程方式更改当前位置:

* `history.push(to: To, state?: State)`
* `history.replace(to: To, state?: State)`
* `history.go(delta: number)`
* `history.back()`
* `history.forward()`

### 示范

```js
// Push a new entry onto the history stack.
history.push('/home');

// Push a new entry onto the history stack with a query string
// and some state. Location state does not appear in the URL.
history.push('/home?the=query', { some: 'state' });

// If you prefer, use a location-like object to specify the URL.
// This is equivalent to the example above.
history.push({
  pathname: '/home',
  search: '?the=query'
}, {
  some: state
});

// Go back to the previous history entry. The following
// two lines are synonymous.
history.go(-1);
history.back();
```

## navigate

导航器。

```js
navigate(target);
```

#### 参数

* `target`: 支持 `string` 或 `HTMLAnchorElement`、`Event` 对象

## 常见问题

### 应用的二级路由如何处理？

应当交给应用自己处理，例如 vue-router 等，WebWidget router 只负责管理一级路由。

### 为什么不提供配置的形式管理路由？

WebWidget router 的核心职责是提供关键功能，这样使得它能够具备更好的可扩展性，你可以基于这些关键功能来实现更多的功能。