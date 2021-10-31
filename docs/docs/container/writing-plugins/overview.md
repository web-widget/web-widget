# 容器 >> 编写插件 >> 概述 || 1

这份文档整理了[接口文档](../interfaces/index.md)中涉及到扩展的部分。

* [HTMLWebWidgetElement](../interfaces/html-web-widget-element.md) 可以扩展应用容器的功能
  * [createDependencies](../interfaces/html-web-widget-element.md#createdependencies) 应用依赖注入的勾子
  * [createLoader](../interfaces/html-web-widget-element.md#createloader) 应用加载器的勾子
  * [createRenderRoot](../interfaces/html-web-widget-element.md#createrenderroot) 应用渲染节点的勾子
* [WebWidgetDependencies](../interfaces/web-widget-dependencies.md) 可以扩展应用运行所需的接口