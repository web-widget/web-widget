import { describe, test, expect } from 'vitest';
import fetch from './fetch';
import { registerSnapshotTests } from './register-snapshot-tests';

describe('Should match snapshot', () => {
  registerSnapshotTests({
    test,
    expect,
    fetch,
  });

  test('non-progressive React Shadow DOM SSR omits replacement scripts', async () => {
    const response = await fetch('/shadow-dom/react');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('<template shadowrootmode="open">');
    expect(html).not.toContain('$RC(');
  });

  test('Svelte layout highlights navigation after rendering the menu', async () => {
    const response = await fetch('/shadow-dom/svelte');
    const html = await response.text();
    const menuLink = '<a href="/shadow-dom/svelte"';
    const activeMenuScript =
      "document.querySelectorAll('aside a[href]').forEach";

    expect(response.status).toBe(200);
    expect(html).toContain(menuLink);
    expect(html).toContain(activeMenuScript);
    expect(html.indexOf(activeMenuScript)).toBeGreaterThan(
      html.indexOf(menuLink)
    );
  });
});
