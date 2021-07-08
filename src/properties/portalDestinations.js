// 钩子：创建应用内的传送门目标点定义接口
export function createPortalDestinations(model) {
  return {
    get() {
      return model.portalDestinations.get(...arguments);
    },
    define() {
      return model.portalDestinations.define(...arguments);
    }
  };
}
