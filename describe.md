# WebWidget 应用描述

使用 pageckage.json 来描述应用，相关的字段：

| 名称                                                         | 必须  | 类型                                     | 详细                                                         |
| ------------------------------------------------------------ | ---- | --------------------------------------- | ------------------------------------------------------------ |
| `name`                                                       | Y    | `string`                                | 应用的名称必须用全小写无空格的字母组成                             |
| `main`                                                       | Y    | `string`                                | 应用入口                                                      |
| `webWidget`                                                  | Y    | `string`                                | 应用采用的 WebWidget 规范版本。当前为 `1.0.0`                    |
| `version`                                                    | Y    | `string`                                | [SemVer](https://semver.org/) 版本模式兼容                     |
| `configuratorMain`                                           |      | `string`                                | 应用编辑模式的设置面板入口。用于给可视化编辑器提供应用参数的 UI，它也是一个 webWidget 应用 |
| `license`                                                    |      | `string`                                | 参考 [npm's documentation](https://docs.npmjs.com/files/package.json#license)。如果你在应用根目录已经提供了 `LICENSE` 文件。那么 `license` 的值应该是 `"SEE LICENSE IN <filename>"` |
| `displayName`                                                |      | `string`                                | 应用市场所显示的应用名称                                          |
| `description`                                                |      | `string`                                | 简单地描述应用是做什么的                                          |
| `categories`                                                 |      | `string[]`                              | 应用分类                                                       |
| `keywords`                                                   |      | `array`                                 | **关键字**（数组），这样用户可以更方便地找到你的应用。到时候会和市场上的其他应用以**标签**筛选在一起 |
| `icon`                                                       |      | `string`                                | icon 的文件路径，最小 128x128 像素 (视网膜屏幕则需 256x256)         |

你还可以参考 [npm 的 `package.json`](https://docs.npmjs.com/files/package.json)。

> 💡 我们需要考虑多语言适配。
