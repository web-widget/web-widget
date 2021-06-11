// 钩子：创建应用的渲染容器
export function createContainer(model) {
  const view = model.view;
  const HTMLWebWidgetElement = view.constructor;
  const SANDBOX_INSTANCE = HTMLWebWidgetElement.SANDBOX_INSTANCE;
  const sandbox = view[SANDBOX_INSTANCE];

  if (sandbox) {
    const sandboxDoc = sandbox.global.document;
    const style = sandboxDoc.createElement('style');
    style.textContent = `body{margin:0}`;
    sandboxDoc.head.appendChild(style);
    return sandbox.global.document.body;
  }

  return view.attachShadow({ mode: 'closed' });
}
