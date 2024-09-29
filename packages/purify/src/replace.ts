export function replace(
  string: string,
  matchRegExp: RegExp,
  replace: (code: number) => string | undefined
): string {
  const str = '' + string;
  const match = matchRegExp.exec(str);

  if (!match) {
    return str;
  }

  let escape;
  let html = '';
  let index = 0;
  let lastIndex = 0;

  for (index = match.index; index < str.length; index++) {
    escape = replace(str.charCodeAt(index));

    if (!escape) {
      continue;
    }

    if (lastIndex !== index) {
      html += str.substring(lastIndex, index);
    }

    lastIndex = index + 1;
    html += escape;
  }

  return lastIndex !== index ? html + str.substring(lastIndex, index) : html;
}
