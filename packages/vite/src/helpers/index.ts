export function isFilePathname(pathname: string) {
  const basename = pathname.split('/').at(-1);
  // Match: /foo/bar/index.html
  // Mismatch: /foo/bar/(.*)
  return basename && /[^(]\.[^)]+/.test(basename);
}

export function addTrailingSlash(pathname: string) {
  if (!pathname.endsWith('/')) {
    if (!isFilePathname(pathname)) {
      return pathname + '/';
    }
  }
  return pathname;
}
