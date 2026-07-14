import { describe, expect, it } from 'vitest';
import { frameworks, navigation } from '../routes/(components)/catalog';

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
});
