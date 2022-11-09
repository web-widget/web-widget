# 应用容器 >> 插件 >> 概述 ||1

Web Widget 附带了一些开箱即用的插件。

- [router](./router.md) 单页面路由
- [system-loader](./system-loader.md) `system` 格式支持
- [umd-loader](./umd-loader.md) `umd` 格式支持

由于 Web Widget 容器是立即运行的，如果异步引入插件可能导致无法正常生效，最好是将插件和 Web Widget 容器打包在一起。