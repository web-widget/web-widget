import { HTMLWebWidgetElement } from '@web-sandbox.js/web-widget';
import '@web-sandbox.js/sandbox';
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
  widget.type = 'umd';
  widget.sandboxed = sandboxed;
  widget.src = '/test/test.widget.js';
  document.body.appendChild(widget);

  widget.mount();
  await dataUpdate(widget);

  if (widget.data.lifecycle !== 'mount') {
    throw new Error(`Mount error`);
  }
};

const textCase = async sandboxed => {
  const widget = document.createElement('web-widget');
  widget.inactive = true;
  widget.name = 'TestWidget';
  widget.type = 'umd';
  widget.sandboxed = sandboxed;
  widget.text = await get('/test/test.widget.js');
  document.body.appendChild(widget);

  widget.mount();
  await dataUpdate(widget);

  if (widget.data.lifecycle !== 'mount') {
    throw new Error(`Mount error`);
  }
};

const noNameAttrCase = async (libraryName, sandboxed) => {
  const widget = document.createElement('web-widget');
  widget.inactive = true;
  widget.type = 'umd';
  widget.sandboxed = sandboxed;
  widget.text = `
      window.${libraryName} = () => ({      
        async mount({ context }) {
          setTimeout(() => {
            context.update({
              data: {
                lifecycle: 'mount'
              }
            });
          });
        }
      });
    `;

  document.body.appendChild(widget);

  widget.mount();
  await dataUpdate(widget);

  if (widget.data.lifecycle !== 'mount') {
    throw new Error(`Mount error`);
  }
};

describe('Load module', () => {
  it('Load the UMD module', async () => srcCase());

  it('Load the UMD module: local', async () => textCase());

  it('Load module(The name attribute is not set): 0', () =>
    noNameAttrCase('test0'));

  it('Load module(The name attribute is not set): 1', () =>
    noNameAttrCase('test1'));

  it('Load module(The name attribute is not set): 2', () =>
    noNameAttrCase('test2'));
});

describe('Sandbox mode', () => {
  it('Load the UMD module', async () => srcCase(true));

  it('Load the UMD module: local', async () => textCase(true));

  it('Load module(The name attribute is not set): 0', () =>
    noNameAttrCase('test0', true));

  it('Load module(The name attribute is not set): 1', () =>
    noNameAttrCase('test1', true));

  it('Load module(The name attribute is not set): 2', () =>
    noNameAttrCase('test2', true));
});
