// https://developer.mozilla.org/docs/Web/JavaScript/Guide/Regular_expressions#escaping
export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
