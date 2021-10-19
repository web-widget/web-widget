import 'systemjs';
import '@web-sandbox.js/web-widget';
import '../src/index.js';

const get = url =>
  fetch(url).then(res => {
    if (!res.ok) {
      throw Error([res.status, res.statusText, url].join(', '));
    }
    return res.text();
  });

describe('Load module', () => {
  it('Load the System module', async () => {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.type = 'system';
    widget.src = '/test/hello-world.system.widget.js';
    document.body.appendChild(widget);

    window.TEST_SYSTEM_LIFECYCLE = null;
    return widget.load().then(() => {
      if (window.TEST_SYSTEM_LIFECYCLE !== 'load') {
        throw new Error('Load error');
      }
    });
  });

  it('Load the System module: local', async () => {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.type = 'system';
    widget.text = await get('/test/hello-world.system.widget.js');
    document.body.appendChild(widget);

    window.TEST_SYSTEM_LIFECYCLE = null;
    return widget.load().then(() => {
      if (window.TEST_SYSTEM_LIFECYCLE !== 'load') {
        throw new Error('Load error');
      }
    });
  });
});
