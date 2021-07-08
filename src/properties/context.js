// 钩子：创建应用上下文接口
export function createContext(model) {
  const view = model.view;
  return {
    mount() {
      return view.mount();
    },
    unmount() {
      return view.unmount();
    }
  };
}
