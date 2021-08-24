import { expect } from '@esm-bundle/chai';
import { WebWidgetDependencies } from '../src/WebWidgetDependencies.js';

describe('WebWidgetDependencies', () => {
  it('It should be a function', () => {
    expect(WebWidgetDependencies).to.be.a('function');
  });
});
