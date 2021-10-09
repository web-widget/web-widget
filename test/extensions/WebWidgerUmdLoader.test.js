import '../../src/index.js';
import '../../extensions/WebWidgerUmdLoader.js';

const get = url =>
  fetch(url).then(res => {
    if (!res.ok) {
      throw Error([res.status, res.statusText, url].join(', '));
    }
    return res.text();
  });

describe('Load module', () => {
  it('Load the UMD module', async () => {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.name = 'HelloWorld';
    widget.type = 'umd';
    widget.src = '/test/widgets/hello-world.umd.widget.js';
    document.body.appendChild(widget);

    window.TEST_UMD_LIFECYCLE = null;
    return widget.load().then(() => {
      if (window.TEST_UMD_LIFECYCLE !== 'load') {
        throw new Error('Load error');
      }
    });
  });

  it('Load the UMD module: local', async () => {
    const widget = document.createElement('web-widget');
    widget.inactive = true;
    widget.name = 'HelloWorld';
    widget.type = 'umd';
    widget.text = await get('/test/widgets/hello-world.umd.widget.js');
    document.body.appendChild(widget);

    window.TEST_UMD_LIFECYCLE = null;
    return widget.load().then(() => {
      if (window.TEST_UMD_LIFECYCLE !== 'load') {
        throw new Error('Load error');
      }
    });
  });
});
