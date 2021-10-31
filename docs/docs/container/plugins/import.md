# 容器 >> 插件 >> Import || 3

Web Widget 应用导入标签 `<web-widget.import>` 实现。

* 只需要导入一次配置后，多处可使用
* 有利于静态分析 HTML 中小挂件的依赖关系
* 让容器具备更好的语义

## 安装

```bash
npm install @web-widget/import --save
```

## 使用

```html
<web-widget.import as="hello-world" from="./slot.widget.js"></web-widget.import>
<web-widget.import as="my-box" from="./my-box.widget.js" data-id="diw32H"></web-widget.import>

<hello-world>
  <p slot="main">hello wrold</p>
</hello-world>

<hello-world>
  <p slot="main">hello web-widget</p>
</hello-world>

<my-box>
  <hello-world>
    <p slot="main">hello web-widget</p>
  </hello-world>
</my-box>

<script type="module">
  import '@web-widget/container';
  import '@web-widget/import';
</script>
```