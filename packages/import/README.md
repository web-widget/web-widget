# Web Widget import

这是 Web Widget 容器标签的语法糖插件。

[文档](https://web-widget.js.org/docs/container/plugins/import/)

## 安装

```bash
npm install --save @web-widget/import
```

## 使用

```html
<web-widget.import as="hello-world" from="./slot.widget.js"></web-widget.import>

<hello-world>
  <p slot="main">hello wrold</p>
</hello-world>

<hello-world>
  <p slot="main">hello web-widget</p>
</hello-world>

<script type="module">
  import '@web-widget/container';
  import '@web-widget/import';
</script>
```

## 运行示例

```bash
npm run examples
```