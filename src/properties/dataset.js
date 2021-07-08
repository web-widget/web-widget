// 钩子：创建应用数据集
export function createDataset(model) {
  const view = model.view;
  const data = {};
  Object.assign(data, view.dataset);
  return data;
}
