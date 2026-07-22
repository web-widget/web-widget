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

  test('non-progressive React Light DOM SSR omits pending replacements', async () => {
    const response = await fetch('/fetching-data');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('Fetching data');
    expect(html).not.toContain('template id="B:');
    expect(html).not.toContain('div hidden id="S:');
    expect(html).not.toContain('$RC(');
  });

  test('Svelte layout highlights navigation after rendering the menu', async () => {
    const response = await fetch('/shadow-dom/svelte');
    const html = await response.text();
    const menuLink = '<a href="/shadow-dom/svelte"';
    const menuEnhancementScript = 'web-router-playground:menu-scroll';

    expect(response.status).toBe(200);
    expect(html).toContain(menuLink);
    expect(html).toContain(menuEnhancementScript);
    expect(html.indexOf(menuEnhancementScript)).toBeGreaterThan(
      html.indexOf(menuLink)
    );
  });

  test('HTML layout emits an executable menu enhancement script', async () => {
    const response = await fetch('/frameworks/html');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain(
      "document.querySelector('[data-playground-menu]')"
    );
    expect(html).not.toContain('document.querySelector(&#39;');
  });
});
