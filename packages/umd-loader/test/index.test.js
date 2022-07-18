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
  widget.type = 'umd';
  widget.src = '/test/test.widget.js';

  let done = false;
  widget.customProperties = {
    test() {
      done = true;
    }
  };

  document.body.appendChild(widget);

  widget.mount();
  await dataUpdate(widget);

  if (!done) {
    throw new Error(`Mount error`);
  }
};

const noNameAttrAndSrcCase = async () => {
  const widget = document.createElement('web-widget');
  widget.inactive = true;
  widget.type = 'umd';
  widget.src = '/test/test2.widget.js';

  let done = false;
  widget.customProperties = {
    test() {
      done = true;
    }
  };

  document.body.appendChild(widget);

  widget.mount();
  await dataUpdate(widget);

  if (!done) {
    throw new Error(`Mount error`);
  }
};

describe('Load umd module', () => {
  it('Import script', async () => srcCase());

  it('Import script: The name attribute is not set: 0', () =>
    noNameAttrAndSrcCase());

  it('Import script: The name attribute is not set: 1', () =>
    noNameAttrAndSrcCase());

  it('Import script: The name attribute is not set: 2', () =>
    noNameAttrAndSrcCase());
});
