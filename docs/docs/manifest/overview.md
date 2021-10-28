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

<inline-notification type="warning">

这份文档没有完成，它随时都有可能发生重大的变更。

</inline-notification>

清单并非是 Web Widget 应用运行的必备要素，它存在的目的是为了让 Web Widget 应用能够恰到好处的展示在应用市场中、在可视化编辑器中能够支持可视化配置等，因此我们设计了一份清单标准。

## package.json

使用 pageckage.json 来描述应用。相关的字段：

| 名称                                                         | 必须  | 类型                                     | 详细                                                         |
| ------------------------------------------------------------ | ---- | --------------------------------------- | ------------------------------------------------------------ |
| `main`                                                       | Y    | `string`                                | 应用入口 UMD 格式版本                                           |
| `module`                                                     | Y    | `string`                                | 应用入口 ES module 格式版本                                     |
| `system`                                                     | Y    | `string`                                | 应用入口 System 格式版本                                        |
| `version`                                                    | Y    | `string`                                | [SemVer](https://semver.org/) 版本模式兼容                     |
| `displayName`                                                |      | `string`                                | 应用市场所显示的应用名称                                          |
| `description`                                                |      | `string`                                | 简单地描述应用是做什么的                                          |
| `categories`                                                 |      | `string[]`                              | 应用分类                                                       |
| `keywords`                                                   |      | `array`                                 | **关键字**（数组），这样用户可以更方便地找到你的应用。到时候会和市场上的其他应用以**标签**筛选在一起 |
| `icon`                                                       |      | `string`                                | icon 的文件路径，最小 128x128 像素 (视网膜屏幕则需 256x256)         |

你还可以参考 [npm 的 `package.json`](https://docs.npmjs.com/files/package.json)。