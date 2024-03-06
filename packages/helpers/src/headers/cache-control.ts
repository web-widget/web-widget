export function setCacheControl(headers: Headers, cacheControl: string) {
  const directives = cacheControl
    ?.split(',')
    .map((directive) => directive.toLowerCase());

  if (directives) {
    const existingDirectives =
      headers
        .get('Cache-Control')
        ?.split(',')
        .map((d) => d.trim().split('=', 1)[0]) ?? [];
    for (const directive of directives) {
      let [name, value] = directive.trim().split('=', 2);
      name = name.toLowerCase();
      if (!existingDirectives.includes(name)) {
        headers.append('Cache-Control', `${name}${value ? `=${value}` : ''}`);
      }
    }
  }
}
