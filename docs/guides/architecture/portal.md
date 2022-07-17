# 容器化 >> 唤起子应用 || 50

```js script
import '@rocket/launch/inline-notification/inline-notification.js';
```

Web Widget 容器允许应用嵌套或者在容器外打开其他 Web Widget 应用，这些新打开的应用都称作子应用。

Web Widget 容器在卸载或者移除之前都会检查子应用的状态，确保它们也跟随应用被卸载和移除。

## 唤起子应用

```js
export async function mount({ container }) {
  const userWidget = document.createElement('web-widget');
  userWidget.src = './users.widget.js';
  container.appendChild(userWidget);
})
```

生成的 DOM：

```html
<web-widget>
  #shadow-root (closed)
    <web-widget src="./users.widget.js">
      #shadow-root (closed)
    </web-widget>
</web-widget>
```