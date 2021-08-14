import { expect } from '@esm-bundle/chai';
import { HTMLWebWidgetElement } from '../src/index.js';
import { WebWidgetDependencies } from '../src/WebWidgetDependencies.js';
import { createWidget } from './utils.js';

describe('WebWidgetDependencies', () => {
  it('It should be a function', () => {
    expect(WebWidgetDependencies).to.be.a('function');
  });
});
