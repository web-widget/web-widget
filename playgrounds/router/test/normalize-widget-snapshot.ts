const GENERATED_WIDGET_ID = /<web-widget[^>]*? id="(w[0-9a-z]+)"/g;

export function normalizeWidgetIds(body: string): string {
  let normalized = body;
  const ids = [
    ...new Set(
      Array.from(normalized.matchAll(GENERATED_WIDGET_ID), (match) => match[1])
    ),
  ];
  const replacements = ids
    .map((id, index) => [id, `WIDGET_ID_${index}`] as const)
    .sort(([left], [right]) => right.length - left.length);

  for (const [id, replacement] of replacements) {
    normalized = normalized.replaceAll(id, replacement);
  }
  return normalized;
}

export function normalizeSolidWidgetSnapshot(body: string): string {
  const normalized = body.replace(/<script>[\s\S]*?<\/script>/g, (script) =>
    script.includes('_$HY') || script.includes('$R[')
      ? '<script>SOLID_RUNTIME</script>'
      : script
  );
  return normalizeWidgetIds(normalized);
}
