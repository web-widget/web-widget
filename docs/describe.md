# [WIP] WebWidget 清单

使用 pageckage.json 来描述应用，相关的字段：

| 名称                                                         | 必须  | 类型                                     | 详细                                                         |
| ------------------------------------------------------------ | ---- | --------------------------------------- | ------------------------------------------------------------ |
| `name`                                                       | Y    | `string`                                | 应用的名称必须用全小写无空格的字母组成                             |
| `main`                                                       | Y    | `string`                                | 应用入口                                                      |
| `webWidget`                                                  | Y    | `string`                                | 应用采用的 WebWidget 规范版本。当前为 `1.0.0`                    |
| `version`                                                    | Y    | `string`                                | [SemVer](https://semver.org/) 版本模式兼容                     |
| `configuratorMain`                                           |      | `string`                                | 应用编辑模式的设置面板入口                                        |
| `license`                                                    |      | `string`                                | 参考 [npm's documentation](https://docs.npmjs.com/files/package.json#license)。如果你在应用根目录已经提供了 `LICENSE` 文件。那么 `license` 的值应该是 `"SEE LICENSE IN <filename>"` |
| `displayName`                                                |      | `string`                                | 应用市场所显示的应用名称                                          |
| `description`                                                |      | `string`                                | 简单地描述应用是做什么的                                          |
| `categories`                                                 |      | `string[]`                              | 应用分类                                                       |
| `keywords`                                                   |      | `array`                                 | **关键字**（数组），这样用户可以更方便地找到你的应用。到时候会和市场上的其他应用以**标签**筛选在一起 |
| `icon`                                                       |      | `string`                                | icon 的文件路径，最小 128x128 像素 (视网膜屏幕则需 256x256)         |

你还可以参考 [npm 的 `package.json`](https://docs.npmjs.com/files/package.json)。


> 💡 文档编写者注释
> 
> 通常来说，一个应用最多只有一个设置面板入口，但是对于 EditorX 之类的编辑器它似乎可以有一个以上的自定义设置面板入口，所以 `configuratorMain` 是否需要支持 `object[]` 类型扩展？如果一旦有多个入口，那么随之而来的是需要定义入口的名称、图标等内容，然而我们希望保持简单，这些可以留给 WebWidget 规范后续的版本考虑。
>
> pageckage.json 似乎没有提供标准的字段来描述多语言，这意味着 WebWidget 应用商店要求适配多语言的时候会无能为力，这些值得我们探讨。
