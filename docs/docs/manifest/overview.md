---
eleventyNavigation:
  key: 清单 >> 概述
  title: 概述
  parent: 清单
  order: 1
---

```js script
import '@rocket/launch/inline-notification/inline-notification.js';
```

# Web Widget 清单

Web Widget 清单通常用于后端的管理系统获取信息或者增强可视化编辑器的能力，Web Widget 应用没有它也以工作，但有了它后可以让应用变得更强，例如可视化编辑、性能、安全等众多关键要素上有所突破！

GitHub 上有一份专门用于发展此规范的[仓库](https://github.com/web-widget/web-widget-manifest)，它提供了 [schema.d.ts](https://github.com/web-widget/web-widget-manifest/blob/master/schema.d.ts) 文件来描述此规范，而这篇文档尽量以简单的方式让你能够理解其中的关键部分。

<inline-notification type="warning">

这份规范在探讨状态，它随时都有可能发生变更。

</inline-notification>

## 初衷

* 我们希望创建真正开放且透明的格式，避免组件开发者将自己宝贵的时间花在私有且封闭的无代码、低代码平台上，而是能够掌握其中核心技术
* 组件是一种数字生产物料，它应当尽可能的被重复利用并且交给生产者使用，这意味着使用它的人不一定具备专业能力，所以我们应当尽可能将代码中的细节透明化，以支持可视化操作
* 我们希望能够做到最好，这个过程中参考了 [Custom Elements Manifest](https://github.com/webcomponents/custom-elements-manifest)、[Web Application Manifest](https://www.w3.org/TR/appmanifest/)、[Packaged Web Apps (Widgets)](https://www.w3.org/TR/2018/OBSL-widgets-20181011)、[Chrome Extensions: Manifest file format](https://developer.chrome.com/docs/extensions/mv3/manifest/)、[VS Code: Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest) 等众多的清单格式

## 引入清单

为了让程序能够在不下载压缩包的情况下找到带有 web widget 应用清单的 NPM 包，包应该在 `package.json` 文件中使用 `webWidget ` 字段来指向清单文件。

```json
{
  "name": "example-package",
  "webWidget": "web-widget.json",
  "keywords": ["web-widget-application"]
}
```

* 清单文件必须使用固定文件名—— `web-widget.json`，而不是其他名称。因为 Web Widget 应用程序可能以 `zip` 或者其他格式来封装，这样做的目的是确保程序能够找到它，而不依靠 NPM
* 推荐在 `package.json` 文件中的 `keywords` 中增加 `web-widget-application` 关键字，以便用户能够使用 NPM 的搜索功能找到开源的、符合 Web Widget 应用规范的包

## 示例文件

`web-widget.json`

<pre>
{
  "<a href="#schemaversion">schemaVersion</a>": "0.0.0",
  "<a href="#name">name</a>": "@gaoding-inc/demo-widget",
  "<a href="#displayname">displayName</a>": "Web Widget Demo",
  "<a href="#version">version</a>": "1.0.0",
  "<a href="#summary">summary</a>": "The Markdown to use for the main readme of this package.",
  "<a href="#icons">icons</a>": [
    {
      "src": "icon/lowres.webp",
      "sizes": "64x64",
      "type": "image/webp"
    },
    {
      "src": "icon/lowres.png",
      "sizes": "64x64"
    },
    {
      "src": "icon/hd_hi",
      "sizes": "128x128"
    }
  ],
  "<a href="#path">path</a>": "demo-widget.esm.js",
  "<a href="#fallbackpath">fallbackPath</a>": "demo-widget.system.js",
  "<a href="#slots">slots</a>": [
    {
      "name": "title",
      "summary": "Title slot"
    }
  ],
  "<a href="#cssparts">cssParts</a>": [],
  "<a href="#cssproperties">cssProperties</a>": [
    {
      "name": "--text-color",
      "syntax": "&lt;color&gt;",
      "default": "#ff0000",
      "summary": "Set text color"
    }
  ],
  "<a href="#data">data</a>": {
    "schema": {/* ..[JSON Schema] */}
  },
  "<a href="#datauserinterface">dataUserInterface</a>": {
    "path": "demo-options-ui.esm.js",
    "fallbackPath": "demo-options-ui.system.js"
  }
}
</pre>

## 基本

### schemaVersion

清单的格式版本。由于当前清单格式由于尚未正式发布，因此版本号为 `0.0.0`。

### name

应用名。通常和 `package.json` 的 `name` 一一对应，它是应用市场中区分不同应用的名称。

### version

应用的版本名称。通常和 `package.json` 的 `version` 一一对应。

### path

应用入口文件路径，格式为 ES module。

<inline-notification>

除了上述字段之外，本文档中后续的字段都是可选的。

</inline-notification>

### fallbackPath

应用入口文件的备选格式路径。通常是 `system` 格式，它为了解决 ES module 在浏览器的兼容问题，例如支持导入映射。

## 元数据

### displayName

应用的显示名称。通常作为短名称显示在应用市场列表中，支持 Markdown 格式。

### summary

应用的简介。通常在应用市场列表中展示。

### icons

应用的图标列表。

* `path`: 图标路径
* `sizes`: 图标尺寸规格
* `type`: 图标格式类型

### description

应用的完整介绍。支持 Markdown 格式。

## 插槽

### slots

应用的插槽列表。

* `name`
* `summary`
* `description`

## 主题

### cssParts

应用的 CSS Part 列表。

* name
* summary
* description

### cssProperties

应用的 CSS 变量列表。

* `name`
* `summary`
* `description`
* `syntax`: The syntax must be a valid CSS [syntax string](https://developer.mozilla.org/en-US/docs/Web/CSS/@property/syntax) as defined in the CSS Properties and Values API
* `default`

## 数据

### data

应用的数据结构描述。可视化编辑器会基于它来自动的生成数据编辑界面。

* `schema`: 用于描述数据结构的 [JSON Schema](https://json-schema.org/specification.html) 数据。你可以通过诸如 [https://www.jsonschema.net](https://www.jsonschema.net) 在线工具生成它

### dataUserInterface

自定义编辑数据的用户界面。可视化编辑器会根据它来展示用户界面用于数据编辑，它优先级高于 `data.schema` 的自动化 UI 生成器。

* `path`: 用于展示数据的 Web Widget 应用文件路径，格式为 ES module
* `fallbackPath`: 用于展示数据的 Web Widget 应用文件的备选格式路径

--------------------

下个阶段工作重点：

* 基本
  * 模板占位内容（SRG）
  * 外部共享依赖
* 性能
  * 重要的需要预加载的资源描述
* 安全
  * 数据请求声明（CSP）
  * 沙盒化声明
* 元数据
  * 关键字
  * 分类
  * 最佳展示尺寸声明
  * 多语言
* 数据
  * dataUserInterface
    * 最佳展示尺寸声明