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
