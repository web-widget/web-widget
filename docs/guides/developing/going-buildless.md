# 应用开发 >> 构建 ||20

浏览器在过去几年中得到了很大改进，现在可以使用浏览器的原生模块加载器进行 Web Widget 应用开发，而无需复杂的构建工具。

## 开发服务器

由于 Web Widget 基于原生浏览器 API，因此你可以使用任何简单的 Web 服务器进行开发。

我们推荐 `@web/dev-server` 项目生成器附带的。它添加了有用的开发人员生产力功能，例如监视模式、缓存和插件 API，让开发阶段几乎不用等待构建工具。查看[官方文档](https://modern-web.dev/docs/dev-server/overview/)以获取有关开发服务器的更多信息。

## 运行服务器

要在项目中运行服务器，请执行以下命令：

```
npm start
```

如果你编辑此文件或 Web 服务器提供的任何其他文件，浏览器将自动重新加载。

## 裸模块导入

javascript 项目中的常见做法是使用所谓的“裸模块导入”。这些是 `imports` 语句，它仅指定包的名称或包内的文件。

例如：

```js
import foo from 'foo';
```

当 `node_modules` 文件夹中的依赖项需要引用其他包时，此类导入很有用。不幸的是，今天的浏览器不理解这种导入方式，需要某种形式的预处理来解析导入以引用实际文件位置。幸运的是 `@web/dev-server` 可以使用该 `--node-resolve` 选项为我们处理这个问题。

将来，像 [import maps](https://github.com/WICG/import-maps) 这样的标准将允许浏览器理解这些类型的导入，而无需转换步骤，而目前你可以通过[发布文档](./publishing.md)了解到如何处理浏览器兼容问题。