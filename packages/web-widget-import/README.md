# WebWidget import

这是 WebWidget 容器的语法糖，用于实现组件的 `import` 标签。

## 安装

```bash
npm install @web-sandbox.js/web-widget-import --save
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
  import '@web-sandbox.js/web-widget';
  import '@web-sandbox.js/web-widget-import';
</script>
```