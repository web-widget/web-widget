import { expect } from '@esm-bundle/chai';
import { HTMLWebWidgetElement } from '../../src/index.js';
import '../../extensions/WebWidgerUmdLoader.js';

describe('Load module', () => {
  it('Load the UMD module', async () => {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.name = 'HelloWorld';
    widget.type = 'umd';
    widget.src = '/test/widgets/hello-world.umd.widget.js';
    document.body.appendChild(widget);

    return widget.load().then(() => {
      if (window.TEST_UMD_LIFECYCLE !== 'load') {
        throw new Error('Load error');
      }
    });
  });
});
