// 钩子：创建应用数据集
export function createData(model) {
  const view = model.view;
  const data = {};
  const includeDataId = view.getAttribute('include-data');

  if (includeDataId) {
    const dataSourceNode =
      includeDataId && view.getRootNode().getElementById(includeDataId);
    const dataSourceContent = dataSourceNode && dataSourceNode.textContent;
    if (dataSourceContent) {
      Object.assign(data, JSON.parse(dataSourceContent));
    }
  }

  Object.assign(data, view.dataset);
  return data;
}
