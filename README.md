# Web Widget

[![CI](https://github.com/web-widget/web-widget/actions/workflows/main.yml/badge.svg?event=push)](https://github.com/web-widget/web-widget/actions/workflows/main.yml?query=event%3Apush)

基于现代 Web 的开放式网页小挂件体系。

[web-widget.js.org](https://web-widget.js.org/)

## 为什么要设计 Web Widget

设计 Web Widget 的直接动机来自于 NoCode/LowCode 产品共同的需求驱动，因为这样的产品下需要大量的、开箱即用的组件才能满足客户的需求，因此我们基于此设计了一个开放式的标准解决方案。

### 传统 Library 面临的问题

* 开源社区大量的组件只能在特定的技术框架中才能运行，这种分裂是一种巨大的浪费
* 开发者需要花大量的时间研究每一个命令式组件的接口，写很多胶水代码、测试胶水代码后才能完成一个应用，这些组件难以直接在可视化编辑器中完成排版
* 开源组件的安全问题通常难以被察，这将随时威胁应用的安全
* 越来越多的应用使用了快速迭代的技术栈，如果没有及时更新版本将会降低软件的生命力

### Web Widget 的目标愿景

* 所有人可以使用可视化编辑器与 Web Widget 来搭建网页应用，不需要写代码
* Web Widget 可以运行在不同的前端技术框架中
* Web Widget 的应用能够作为物料的格式标准
* 所有的前端组件都可轻松转换成 Web Widget
* 所有的 NoCode/LowCode 产品，都可兼容 Web Widget
* 公共 CDN 可以随时加载托管在 NPM 或 GitHub 的 Web Widget、无副作用的运行

### 限制

Web Widget 提供的是立即可用的服务，因此应用事件机制、应用的对外接口并非 Web Widget 的目标，这些是传统的 Library 的设计要素。当需要频繁的和外部交互，如果依然使用 Web Widget 那么这将放大它的缺点，这种情况下建议使用传统 Library 来共享代码。

### 实现目标的参考

#### Single-spa

[single-spa](https://single-spa.js.org/) 定义的生命周期格式让 Web 应用跨技术栈、标准化接口提供很好的实践范例，并且它提供了一整套的工程解决方案。

#### JS CDN

Npm 成为了一个托管资源庞大的前端组件的大仓库，基于它有多个开箱即用的公共 CDN 服务。受 ES module 规范的推广，越来越多的工具开始往运行时集成方向演进。

#### Web components

Web components 成为面向未来的组件标准，它提供了良好的隔离手段，并且具备较高的可用性，几乎所有流行开源框架都支持它。

#### Web plugins

在过去，`<embed>` 元素开启了 Web 辉煌的时互动时代，它可以载入远程插件以实现互动内容，例如 Flash。

```html
<embed src="somefilename.swf" width="550" height="400"></embed>
```

#### AMP

[AMP](https://amp.dev) 提供了极致的网页载入性能优化思路，它有一整套被重新设计的组件系统，这使得它能最大程度保证性能。

#### WebSandbox

[WebSandbox.js](https://web-sandbox.js.org) 将虚拟化技术推进到 Web 前端领域，使得创建安全的第三方组件运行的容器化环境成为可能。对应的类似的技术是 [AMP](https://amp.dev) 推出的 [worker-dom](https://github.com/ampproject/worker-dom)，不过它无法使用同步的 DOM API、只能使用少量的 DOM API。

#### OneBox

Google 的 OneBox 与百度的框计算是被规模化应用的小挂件形态（例如在搜索引擎搜索“天气预报”，它们都能给出天气的小挂件结果），这些组件具备非常长的生命力并且可以直达用户。

## 应用场景举例

* 可视化编辑器中的物料系统
* Web 应用插件系统
* 个性化卡片信息流展示（[Google OneBox](https://en.ryte.com/wiki/Google_OneBox) 与[百度框计算](https://baike.baidu.com/item/%E6%A1%86%E8%AE%A1%E7%AE%97/9541258)）
* 单页应用微前端工程架构
