import 'systemjs';
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
  widget.type = 'system';
  widget.src = '/test/test.widget.js';
  document.body.appendChild(widget);

  await widget.mount();
  await dataUpdate(widget);

  if (widget.data.lifecycle !== 'mount') {
    throw new Error(`Mount error`);
  }
};

describe('Load module', () => {
  it('Load the System module', async () => srcCase());
});
