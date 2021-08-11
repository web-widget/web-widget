export function getParentNode(view, constructor) {
  let current = view;
  do {
    current = current.getRootNode().host;
    if (current && current instanceof constructor) {
      return current;
    }
  } while (current);
  return null;
}

export function getChildNodes(view, constructor) {
  const nodes = [];
  const stack = [...view.children];
  while (stack.length) {
    const current = stack.pop();
    if (current instanceof constructor) {
      nodes.push(current);
    } else {
      // 限制：如果目标在 shadow dom 内，那么这里无法找到目标
      stack.unshift(...current.children);
    }
  }
  return nodes;
}
