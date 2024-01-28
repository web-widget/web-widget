export function triggerModulePreload(
  href: string,
  { fetchPriority = 'high', rel = 'modulepreload' } = {}
) {
  const link = (
    Array.from(
      document.querySelectorAll(`link[rel="${rel}"]`)
    ) as HTMLLinkElement[]
  ).find((link) => link.href === href);

  if (link) {
    Object.assign(link, { fetchPriority });
  } else {
    document.head.appendChild(
      Object.assign(document.createElement('link'), {
        href,
        rel,
        fetchPriority,
      })
    );
  }
}
