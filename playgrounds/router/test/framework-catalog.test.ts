import { describe, expect, it } from 'vitest';
import {
  frameworks,
  navigation,
  shadowDomFrameworks,
} from '../routes/(components)/catalog';

describe('framework catalog', () => {
  it('shows the HTML template adapter in framework navigation', () => {
    const html = frameworks.find((framework) => framework.id === 'html');
    const frameworkNavigation = navigation.find(
      (group) => group.name === 'Frameworks'
    );

    expect(html).toMatchObject({
      name: 'HTML',
      href: '/frameworks/html',
    });
    expect(frameworkNavigation?.items).toContainEqual(
      expect.objectContaining({
        title: 'HTML',
        href: '/frameworks/html',
      })
    );
  });

  it.each([
    ['web-components', 'Web Components'],
    ['lit', 'Lit'],
  ])('shows %s in the matrix without a navigation link', (id, name) => {
    const framework = frameworks.find((item) => item.id === id);
    const frameworkNavigation = navigation.find(
      (group) => group.name === 'Frameworks'
    );

    expect(framework).toMatchObject({ name });
    expect(framework).not.toHaveProperty('href');
    expect(frameworkNavigation?.items).not.toContainEqual(
      expect.objectContaining({ title: name })
    );
  });

  it('does not repeat links across navigation groups', () => {
    const links = navigation.flatMap((group) =>
      group.items.map((item) => item.href)
    );

    expect(new Set(links).size).toBe(links.length);
  });

  it('exposes Shadow DOM examples as a top-level navigation group', () => {
    const shadowDom = navigation.find((group) => group.name === 'Shadow DOM');

    expect(
      shadowDom?.items.map(({ title, href }) => ({ title, href }))
    ).toEqual([
      { title: 'Overview', href: '/shadow-dom' },
      ...shadowDomFrameworks.map(({ name, href }) => ({ title: name, href })),
    ]);
  });
});
