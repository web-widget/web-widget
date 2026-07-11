import { html } from './html';
import type { HTML } from './html';
import { classMap, styleMap, ifDefined, when, join } from './directives';

/** Consumes an HTML async iterable into a single string. */
async function stringify(content: HTML): Promise<string> {
  let result = '';
  for await (const chunk of content) {
    result += chunk;
  }
  return result;
}

describe('classMap', () => {
  test('returns space-separated string of truthy classes (pure function)', () => {
    expect(classMap({ a: true, b: true })).toBe('a b');
  });

  test('includes only truthy classes', async () => {
    // prettier-ignore
    const t = html`<div class="${classMap({ active: true, disabled: false, hidden: 0, visible: 1 })}">`;
    expect(await stringify(t)).toBe('<div class="active visible">');
  });

  test('all-falsy values produce empty string', () => {
    expect(classMap({ a: false, b: 0, c: null, d: '' })).toBe('');
  });

  test('empty object produces empty string', async () => {
    // prettier-ignore
    const t = html`<div class="${classMap({})}">`;
    expect(await stringify(t)).toBe('<div class="">');
  });
});

describe('styleMap', () => {
  test('returns semicolon-separated string (pure function)', () => {
    expect(styleMap({ color: 'red' })).toBe('color: red');
  });

  test('converts camelCase to kebab-case', async () => {
    // prettier-ignore
    const t = html`<div style="${styleMap({ color: 'red', fontSize: '16px' })}">`;
    expect(await stringify(t)).toBe(
      '<div style="color: red; font-size: 16px">'
    );
  });

  test('omits null and empty values', async () => {
    // prettier-ignore
    const t = html`<div style="${styleMap({ color: 'red', margin: '', padding: null as unknown as string })}">`;
    expect(await stringify(t)).toBe('<div style="color: red">');
  });

  test('preserves kebab-case and custom properties', async () => {
    // prettier-ignore
    const t = html`<div style="${styleMap({ 'background-color': 'blue', '--my-var': '42' })}">`;
    expect(await stringify(t)).toBe(
      '<div style="background-color: blue; --my-var: 42">'
    );
  });

  test('empty object produces empty string', async () => {
    // prettier-ignore
    const t = html`<div style="${styleMap({})}">`;
    expect(await stringify(t)).toBe('<div style="">');
  });

  test('all null/empty values produce empty string', () => {
    expect(
      styleMap({
        a: '',
        b: null as unknown as string,
        c: undefined as unknown as string,
      })
    ).toBe('');
  });
});

describe('ifDefined', () => {
  test('returns value when defined', () => {
    expect(ifDefined('hello')).toBe('hello');
    expect(ifDefined(42)).toBe(42);
  });

  test('returns empty string when undefined', () => {
    expect(ifDefined(undefined)).toBe('');
  });

  test('null is not treated as undefined', () => {
    expect(ifDefined(null)).toBe(null);
  });

  test('falsy values are preserved (0, false, empty string)', () => {
    expect(ifDefined(0)).toBe(0);
    expect(ifDefined(false)).toBe(false);
    expect(ifDefined('')).toBe('');
  });

  test('renders value in template', async () => {
    const url = 'https://example.com';
    // prettier-ignore
    const t = html`<a href="${ifDefined(url)}">link</a>`;
    expect(await stringify(t)).toBe('<a href="https://example.com">link</a>');
  });

  test('renders empty for undefined in template', async () => {
    // prettier-ignore
    const t = html`<a href="${ifDefined(undefined)}">link</a>`;
    expect(await stringify(t)).toBe('<a href="">link</a>');
  });
});

describe('when', () => {
  test('renders trueCase when condition is truthy', async () => {
    // prettier-ignore
    const t = html`<div>${when(true, html`<span>yes</span>`, html`<span>no</span>`)}</div>`;
    expect(await stringify(t)).toBe('<div><span>yes</span></div>');
  });

  test('renders falseCase when condition is falsy', async () => {
    // prettier-ignore
    const t = html`<div>${when(false, html`<span>yes</span>`, html`<span>no</span>`)}</div>`;
    expect(await stringify(t)).toBe('<div><span>no</span></div>');
  });

  test('renders nothing when falsy and no falseCase', async () => {
    // prettier-ignore
    const t = html`<div>${when(false, html`<span>yes</span>`)}</div>`;
    expect(await stringify(t)).toBe('<div></div>');
  });

  test('supports function arguments (lazy)', async () => {
    // prettier-ignore
    const t = html`<div>${when(true, () => html`<p>lazy</p>`)}</div>`;
    expect(await stringify(t)).toBe('<div><p>lazy</p></div>');
  });
});

describe('when (edge cases)', () => {
  test('truthy non-boolean values render trueCase', async () => {
    // prettier-ignore
    const t1 = html`<div>${when(1, html`<y/>`, html`<n/>`)}</div>`;
    expect(await stringify(t1)).toBe('<div><y/></div>');
    // prettier-ignore
    const t2 = html`<div>${when('text', html`<y/>`, html`<n/>`)}</div>`;
    expect(await stringify(t2)).toBe('<div><y/></div>');
  });

  test('falsy values (0, empty string, null) render falseCase', async () => {
    // prettier-ignore
    const t1 = html`<div>${when(0, html`<y/>`, html`<n/>`)}</div>`;
    expect(await stringify(t1)).toBe('<div><n/></div>');
    // prettier-ignore
    const t2 = html`<div>${when('', html`<y/>`, html`<n/>`)}</div>`;
    expect(await stringify(t2)).toBe('<div><n/></div>');
  });
});

describe('join', () => {
  test('joins items with separator', async () => {
    const items = ['a', 'b', 'c'].map((x) => html`<li>${x}</li>`);
    // prettier-ignore
    const t = html`<ul>${join(items, html`<br>`)}</ul>`;
    expect(await stringify(t)).toBe(
      '<ul><li>a</li><br><li>b</li><br><li>c</li></ul>'
    );
  });

  test('single item has no separator', async () => {
    // prettier-ignore
    const t = html`<ul>${join([html`<li>only</li>`], html`<br>`)}</ul>`;
    expect(await stringify(t)).toBe('<ul><li>only</li></ul>');
  });

  test('empty iterable produces nothing', async () => {
    // prettier-ignore
    const t = html`<ul>${join([], html`<br>`)}</ul>`;
    expect(await stringify(t)).toBe('<ul></ul>');
  });

  test('supports string separator', async () => {
    // prettier-ignore
    const t = html`<div>${join([html`<span>a</span>`, html`<span>b</span>`], ' | ')}</div>`;
    expect(await stringify(t)).toBe(
      '<div><span>a</span> | <span>b</span></div>'
    );
  });

  test('supports function separator (lazy)', async () => {
    // prettier-ignore
    const t = html`<div>${join([html`<span>a</span>`, html`<span>b</span>`], () => html`<hr>`)}</div>`;
    expect(await stringify(t)).toBe(
      '<div><span>a</span><hr><span>b</span></div>'
    );
  });

  test('supports function items (lazy)', async () => {
    // prettier-ignore
    const t = html`<ul>${join([() => html`<li>a</li>`, () => html`<li>b</li>`], html`<br>`)}</ul>`;
    expect(await stringify(t)).toBe('<ul><li>a</li><br><li>b</li></ul>');
  });
});
