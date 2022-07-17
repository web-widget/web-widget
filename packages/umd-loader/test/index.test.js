import { HTMLWebWidgetElement } from '@web-widget/container';
import '../src/index.js';

const dataUpdate = widget =>
  new Promise(resolve => {
    const { INITIAL, UPDATING, MOUNTED } = HTMLWebWidgetElement;
    let oldState = INITIAL;

    widget.addEventListener('statechange', () => {
      if (oldState === UPDATING && widget.state === MOUNTED) {
        resolve(widget.data);
      }
      oldState = widget.state;
    });

    widget.mount();
  });

const srcCase = async () => {
  const widget = document.createElement('web-widget');
  widget.inactive = true;
  widget.name = 'TestWidget';
  widget.type = 'umd';
  widget.src = '/test/test.widget.js';
  document.body.appendChild(widget);

  widget.mount();
  await dataUpdate(widget);

  if (widget.data.lifecycle !== 'mount') {
    throw new Error(`Mount error`);
  }
};

const noNameAttrAndSrcCase = async sandboxed => {
  const widget = document.createElement('web-widget');
  widget.inactive = true;
  widget.type = 'umd';
  widget.sandboxed = sandboxed;
  widget.src = '/test/test2.widget.js';
  document.body.appendChild(widget);

  widget.mount();
  await dataUpdate(widget);

  if (widget.data.lifecycle !== 'mount') {
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
