// 钩子：创建应用属性
export function createAttributes(model) {
  const view = model.view;
  // TODO 考虑过滤一些属性名
  return [...view.attributes].reduce((accumulator, { name, value }) => {
    accumulator[name] = value;
    return accumulator;
  }, {});
}
