export const owners = ['route', 'widget', 'shared'] as const;
export const boundaries = ['document', 'light'] as const;
export const transforms = [
  'plain',
  'module',
  'vue-scoped',
  'vue-scoped-module',
] as const;
export const importPaths = ['relative', 'alias'] as const;

export interface IntegrationCase {
  id: string;
  route: string;
  owner: (typeof owners)[number];
  boundary: (typeof boundaries)[number];
  transform: (typeof transforms)[number];
  importPath: (typeof importPaths)[number];
  selector: string;
  expected: Record<string, string>;
  frameworks?: string[];
}

function cssCase(
  id: string,
  owner: IntegrationCase['owner'],
  boundary: IntegrationCase['boundary'],
  importPath: IntegrationCase['importPath'],
  transform: IntegrationCase['transform'],
  rgb: string
): IntegrationCase {
  return {
    id,
    route: '/css-matrix',
    owner,
    boundary,
    transform,
    importPath,
    selector: `[data-case="${id}"]`,
    expected: {
      '--case-token': `${id}-${owner}-${boundary}-${importPath}-${transform}`,
      color: `rgb(${rgb})`,
      width: '37px',
    },
    frameworks: transform.startsWith('vue') ? ['vue3'] : ['react'],
  };
}

export const integrationCases: IntegrationCase[] = [
  cssCase('C01', 'route', 'document', 'relative', 'plain', '17, 34, 51'),
  cssCase('C02', 'route', 'document', 'alias', 'module', '34, 51, 68'),
  cssCase('C03', 'route', 'document', 'relative', 'vue-scoped', '51, 68, 85'),
  cssCase(
    'C04',
    'route',
    'document',
    'alias',
    'vue-scoped-module',
    '68, 85, 102'
  ),
  cssCase('C05', 'widget', 'light', 'relative', 'plain', '85, 102, 119'),
  cssCase('C06', 'widget', 'light', 'alias', 'module', '102, 119, 136'),
  cssCase('C07', 'widget', 'light', 'relative', 'vue-scoped', '119, 136, 153'),
  cssCase(
    'C08',
    'widget',
    'light',
    'alias',
    'vue-scoped-module',
    '136, 153, 170'
  ),
  cssCase('S01', 'shared', 'light', 'relative', 'plain', '153, 170, 187'),
];

export const cssCases = integrationCases.filter((entry) =>
  /^C0[1-8]$/.test(entry.id)
);

export function validateCases(cases: readonly IntegrationCase[]): void {
  const ids = new Set<string>();
  for (const entry of cases) {
    if (ids.has(entry.id))
      throw new Error(`Duplicate integration case id: ${entry.id}`);
    ids.add(entry.id);
  }
  assertCoverage(cases, 'owner', owners);
  assertCoverage(cases, 'boundary', boundaries);
  assertCoverage(cases, 'transform', transforms);
  assertCoverage(cases, 'importPath', importPaths);
}

function assertCoverage<K extends keyof IntegrationCase>(
  cases: readonly IntegrationCase[],
  key: K,
  values: readonly IntegrationCase[K][]
): void {
  const present = new Set(cases.map((entry) => entry[key]));
  const missing = values.filter((value) => !present.has(value));
  if (missing.length > 0) {
    throw new Error(
      `Integration case coverage missing ${String(key)}: ${missing.join(', ')}`
    );
  }
}

validateCases(integrationCases);
