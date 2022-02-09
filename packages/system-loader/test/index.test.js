import 'systemjs';
import { HTMLWebWidgetElement } from '@web-widget/container';
import '@web-widget/sandbox';
import '../src/index.js';

const get = url =>
  fetch(url).then(res => {
    if (!res.ok) {
      throw Error([res.status, res.statusText, url].join(', '));
    }
    return res.text();
  });

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

const srcCase = async sandboxed => {
  const widget = document.createElement('web-widget');
  widget.inactive = true;
  widget.name = 'TestWidget';
  widget.type = 'system';
  widget.sandboxed = sandboxed;
  widget.src = '/test/test.widget.js';
  document.body.appendChild(widget);

  await widget.mount();
  await dataUpdate(widget);

  if (widget.data.lifecycle !== 'mount') {
    throw new Error(`Mount error`);
  }
};

const textCase = async sandboxed => {
  const widget = document.createElement('web-widget');
  widget.inactive = true;
  widget.name = 'TestWidget';
  widget.type = 'system';
  widget.sandboxed = sandboxed;
  widget.text = await get('/test/test.widget.js');
  document.body.appendChild(widget);

  await widget.mount();
  await dataUpdate(widget);

  if (widget.data.lifecycle !== 'mount') {
    throw new Error(`Mount error`);
  }
};

describe('Load module', () => {
  it('Load the System module', async () => srcCase());

  it('Load the System module: local', async () => textCase());
});

describe('Sandbox mode', () => {
  it('Load the System module', async () => srcCase(true));

  // 由于使用了 data: 协议，但是 WebSandbox 无法支持它
  // it('Load the System module: local', async () => textCase(true));
});
