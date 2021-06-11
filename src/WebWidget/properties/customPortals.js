// 钩子：创建应用内的传送门目标点定义接口
export function createCustomPortals(model) {
  return {
    get() {
      return model.customPortals.get(...arguments);
    },
    define() {
      return model.customPortals.define(...arguments);
    }
  };
}
