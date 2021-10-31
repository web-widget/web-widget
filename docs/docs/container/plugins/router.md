# 容器 >> 插件 >> Router || 2

这是 Web Widget 的路由插件。

## 安装

```bash
npm install @web-widget/router --save
```

## 使用

```html
<web-widget name="home" src="/index.widget.js" inactive></web-widget>
<web-widget name="news" src="/news.widget.js" inactive></web-widget>
<web-widget name="about" src="/about.widget.js" inactive></web-widget>
<web-widget name="vue-router" src="/vue-router.widget.js" inactive></web-widget>
```

为 Web Widget 容器添加 `inactive` 属性，让其不再受 DOM 生命周期控制，以便让交给路由控制它的挂载与卸载行为。

```js
import '@web-widget/container';
import { collection, navigate, history } from  '@web-widget/router';

// 注册应用
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
  // 通知应用集合进行状态变更
  collection.change(location);
}

// 监听路由变更
history.listen(reroute);
reroute();

// 提供全局导航 API（屏蔽了 hash 与 history 模式差异）
window.navigate = navigate;
```

## API

Web Widget Router 由三个领域 API 组合而成。

```js
import { collection, navigate, history } from  '@web-widget/router';
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

Web Widget Router 只负责管理一级路由，二级路由应当由应用自己管理，例如使用 `vue-router` 等。

### 为什么不提供配置的形式管理路由？

的确使用配置的形式有助于提高开发体验，但 Web Widget Router 的核心职责是提供关键功能，这样使得它能够具备更好的可扩展性，因此你可以基于这些关键功能来实现更多的功能。