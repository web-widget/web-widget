# Builder

这是 WebWidget packages 的默认构建工具。

## 使用方式

### 步骤一：为 package.json 添加如下字段：

* `source`: 源代码入口
* `main`: cjs 格式输出目标
* `module`: ES module 格式输出目标
* `unpkg`: UMD 格式输出目标
* `libraryName`: UMD 导出的全局变量名

package.json 示例：

```json
{
  "source": "src/index.js",
  "main": "dist/cjs/system-loader.js",
  "module": "dist/esm/system-loader.js",
  "unpkg": "dist/umd/system-loader.js",
  "libraryName": "WebWidgetSystemLoader"
}
```

### 步骤二：为 package.json 添加构建命令

```json
{
  "scripts": {
    "build": "builder --environment NODE_ENV:production",
  },
  "files": [
    "dist"
  ],
  "devDependencies": {
    "@web-sandbox.js/builder": "^0.0.4"
  }
}
```