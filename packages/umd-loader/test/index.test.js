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

const noNameAttrAndTextCase = async (libraryName, sandboxed) => {
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

describe('Load umd module', () => {
  it('Import script', async () => srcCase());

  it('Exec script', async () => textCase());

  it('Import script: The name attribute is not set: 0', () =>
    noNameAttrAndSrcCase());

  it('Import script: The name attribute is not set: 1', () =>
    noNameAttrAndSrcCase());

  it('Import script: The name attribute is not set: 2', () =>
    noNameAttrAndSrcCase());

  it('Exec script: The name attribute is not set: 0', () =>
    noNameAttrAndTextCase('test0'));

  it('Exec script: The name attribute is not set: 1', () =>
    noNameAttrAndTextCase('test1'));

  it('Exec script: The name attribute is not set: 2', () =>
    noNameAttrAndTextCase('test2'));
});

describe('Sandbox mode', () => {
  it('Import script', async () => srcCase(true));

  it('Exec script', async () => textCase(true));

  it('Import script: The name attribute is not set: 0', () =>
    noNameAttrAndSrcCase(true));

  it('Import script: The name attribute is not set: 1', () =>
    noNameAttrAndSrcCase(true));

  it('Import script: The name attribute is not set: 2', () =>
    noNameAttrAndSrcCase(true));

  it('Exec script: The name attribute is not set: 0', () =>
    noNameAttrAndTextCase('test0', true));

  it('Exec script: The name attribute is not set: 1', () =>
    noNameAttrAndTextCase('test1', true));

  it('Exec script: The name attribute is not set: 2', () =>
    noNameAttrAndTextCase('test2', true));
});
