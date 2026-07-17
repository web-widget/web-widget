import { getWidgetStyleOwner } from './widget-style-ownership';

describe('getWidgetStyleOwner', () => {
  it('keeps backward-compatible light DOM styles in the document', () => {
    expect(getWidgetStyleOwner()).toBe('document');
    expect(getWidgetStyleOwner('light')).toBe('document');
  });

  it('assigns Shadow DOM styles to the widget boundary', () => {
    expect(getWidgetStyleOwner('shadow')).toBe('boundary');
  });
});
