import 'systemjs';
import '@web-widget/container';
import '../src/index.js';

const dataUpdate = widget =>
  new Promise(resolve => {
    widget.addEventListener('update', event => {
      resolve(event.value.data);
    });

    widget.mount();
  });

const srcCase = async () => {
  const widget = document.createElement('web-widget');
  widget.inactive = true;
  widget.name = 'TestWidget';
  widget.type = 'system';
  widget.src = '/test/test.widget.js';

  let done = false;
  widget.customProperties = {
    test() {
      done = true;
    }
  };

  document.body.appendChild(widget);

  await widget.mount();
  await dataUpdate(widget);

  if (!done) {
    throw new Error(`Mount error`);
  }
};

describe('Load module', () => {
  it('Load the System module', async () => srcCase());
});
