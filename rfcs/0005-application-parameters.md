- 开始日期：2021-11-23
- 作者：糖饼

# 目标

为 Web Widget 应用提供启动参数的功能。

# 动机

在 Web Widget 应用里，有会诸多的启动参数信息需要告诉应用程序，以便它们能够正确的处理逻辑。例如当应用程序接收到 `sandboxed` 字段后，应用程序应当遵循沙盒环境的限制而执行逻辑。

```html
<web-widget sandboxed src="app.widget.js"></web-widget>
```

```js
export async function mount({ sandboxed }) {
  if (!sandboxed) {
    // [more code]
  }
})
```

`sandboxed` 参数是作为内置到 Web Widget 应用标准接口中的，但我们还会为 Web Widget 应用增加越来越多的参数，以便可视化编辑器能处理它们，例如 `theme`，而现阶段我们却没有一个真正属于应用程序参数的获取方式，因此这是为什么要提出此 RFC 的动机。

# 产出

- 提供可以自由设置的应用程序参数标准，供用户通过可视化编辑器或者胶水代码来使用
- 将可视化编辑器所需要参数作为应用参数的一部分单独维护，避免侵入应用程序格式标准

# 提议内容

在 Web Widget 应用接口中，增加 `parameters` 字段作为应用启动参数。

## 替代方案对比

`data` 可以作为一种代替方案，但是它有一些不同：

* `data` 是被被设计为应用的数据，它可能会被反序列化后保存在服务端或者本地存储中，而应用程序参数会包含很多不需要存储的数据
* 由于宿主或者应用程序自己都可以调用 `update({ data })` 来更新 `data`，而应用启动参数却是只读的，它们混在一起会引起一些误会

## 指引和例子

```html
<web-widget sandboxed theme="my-theme" src="app.widget.js"></web-widget>
```

```js
export async function mount({ container, parameters }) {
  container.innerHTML = `
    <style>
      :host([theme=my-theme]) h3 {
        color: #FFF;
        background: #000;
      }
    </style>
    <h3>Theme: ${parameters.theme}</h3>
  `;
  if (!parameters.sandboxed) {
    // [more code]
  }
})
```

## 迭代策略

- 接下来将支持使用 JSON schema 来描述 `data` 与 `parameters` 的数据结构，这些将会在 Web Widget 应用清单中出现
- 将可视化编辑器需要的约定字段都将使用 `parameters` 来表达

## 兼容性

- 当前实验性的 `sandboxed` 属性将会从应用接口中删除，而使用 `parameters` 来提供

# 详细设计

* `web-widget` 元素所有的属性，都将出现在 `parameters` 中
* `parameters` 它是一个被冻结的 `object` 结构，类似操作系统环境变量一样，每一项的值都是 `string` 类型
* 当 Web Widget 应用加载后，它就无法再变更

# 需要讨论的问题

目前有三种表达“参数”的单词：

* parameters
* params
* arguments

我目前通过 Google “application xxx“ 获取了使用更广泛的表达方式，是否还有更好的词来描述？


