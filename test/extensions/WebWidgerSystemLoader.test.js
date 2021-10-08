import 'systemjs';
import '../../src/index.js';
import '../../extensions/WebWidgerSystemLoader.js';

describe('Load module', () => {
  it('Load the System module', async () => {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.type = 'system';
    widget.src = '/test/widgets/hello-world.system.widget.js';
    document.body.appendChild(widget);

    return widget.load().then(() => {
      if (window.TEST_SYSTEM_LIFECYCLE !== 'load') {
        throw new Error('Load error');
      }
    });
  });
});
