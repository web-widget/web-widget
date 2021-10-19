# Rollup config

这是 WebWidget packages 的默认构建配置。

## 使用方式

### 步骤一：为 package.json 添加如下字段：

* `source`: 源代码入口
* `main`: cjs 格式输出目标
* `module`: ES module 格式输出目标
* `unpkg`: UMD 格式输出目标

package.json 示例：

```json
{
  "source": "src/index.js",
  "main": "dist/cjs/system-loader.js",
  "module": "dist/esm/system-loader.js",
  "unpkg": "dist/umd/system-loader.js"
}
```

### 步骤二：为 package.json 添加构建命令

```bash
rollup --config node:@web-sandbox.js/rollup-config
```

package.json 示例：

```json
{
  "source": "src/index.js",
  "main": "dist/cjs/system-loader.js",
  "module": "dist/esm/system-loader.js",
  "unpkg": "dist/umd/system-loader.js",
  "scripts": {
    "build": "rollup --config node:@web-sandbox.js/rollup-config --environment NODE_ENV:production",
  },
  "files": [
    "dist"
  ],
  "devDependencies": {
    "@web-sandbox.js/rollup-config": "^0.0.4",
    "rollup": "^2.50.5"
  }
}
```