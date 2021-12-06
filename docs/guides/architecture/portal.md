# 容器化 >> 子应用与传送门 || 50

```js script
import '@rocket/launch/inline-notification/inline-notification.js';
```

Web Widget 容器允许应用嵌套或者在容器外打开其他 Web Widget 应用，这些新打开的应用都称作子应用。

## 挂载子应用

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

## 应用外打开子应用

由于每个 Web Widget 应用都具备明确的视图范围，而一些对话框组件通常需要工作在全局中，因此我们参考 React 设计了一个传送门的概念来解决这样的问题——当然，这需要得到容器宿主的允许。

通过 `createPortal()` 可以创建一个传送门来传输应用到指定位置。


### 定义传送门

传送门工厂函数可以决定应用是否可以被传送以及传送的 DOM 位置，例如我们定义一个 `dialog` 的传送门：

```js
import { HTMLWebWidgetElement } from '@web-widget/container';

let dialog, dialogWidget;
HTMLWebWidgetElement.portalDestinations.define('dialog', () => {
  // Single instance
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialogWidget = document.createElement('web-widget');

    document.body.appendChild(dialog);
    dialog.appendChild(dialogWidget);

    dialogWidget.name = 'dialog';
    dialogWidget.application = () => ({
      async bootstrap({ container, context }) {
        const dialogMain = document.createElement('slot');
        const dialogCloseButton = document.createElement('button');

        dialogCloseButton.innerText = 'close';
        dialogCloseButton.onclick = () => context.unmount();

        container.appendChild(dialogCloseButton);
        container.appendChild(dialogMain);
        dialog.addEventListener('close', () => {
          context.unmount();
        });
      },
      async mount() {
        dialog.showModal();
      },
      async unmount() {
        dialog.close();
      }
    });
  }

  return dialogWidget;
});
```

### 使用传送门

应用可以使用主文档定义好的传送门，例如上述定义的 `dialog` 传送门：

```js
export async function mount({ container, createPortal }) {
  const appContainer = document.createElement('web-widget');
  appContainer.slot = 'main';
  appContainer.src = './user.widget.js';
  // 传送应用
  const cardWidget = createPortal(appContainer, 'dialog');
  cardWidget.mount().then(() => {
    console.log('mounted');
  });
})
```

生成的 DOM：

```html
<web-widget>
  #shadow-root (closed)
</web-widget>

<web-widget src="./card.widget.js">
  #shadow-root (closed)
    <slot name="main">...</slot>
  <web-widget slot="main" src="./user.widget.js">
    #shadow-root (closed)
  </web-widget>
</web-widget>
```

<inline-notification type="warning">

`createPortal()` 接口处于试验性状态。

</inline-notification>

## 子应用生命周期

Web Widget 容器在卸载或者移除之前都会检查子应用的状态，确保它们也跟随应用被卸载和移除。