# Web test runner config

这是 WebWidget packages 的默认测试工具。

## 使用方式

package.json 示例：

```json
{
  "scripts": {
    "test": "tester --coverage",
    "test:watch": "tester --watch"
  },
  "files": [
    "dist"
  ],
  "devDependencies": {
    "@web-widget/tester": "^0.0.4",
    "@esm-bundle/chai": "^4.3.4-fix.0"
  }
}
```