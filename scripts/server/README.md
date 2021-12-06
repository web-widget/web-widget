# Server

这是 Web Widget packages 的默认开发服务器。

## 使用方式

### 为 package.json 添加 examples 命令

```json
{
  "scripts": {
    "examples": "cd examples && server",
  },
  "devDependencies": {
    "@web-widget/server": "^0.0.12"
  }
}
```