// This utility is based on https://github.com/BuilderIO/qwik/
// License: https://github.com/BuilderIO/qwik/blob/5f1c80372dc95b7d1de4b909baed3c08d5eeac2c/LICENSE

function findContainer(el: HTMLElement | null): HTMLElement | null {
  return el?.closest('web-widget[import]') as HTMLElement;
}

function findBox(el: HTMLElement) {
  const display = getComputedStyle(el).display;
  const isDisplayContents = display === 'contents';
  return isDisplayContents ? (el.firstElementChild as HTMLElement) : el;
}

function openInEditor(path: string, srcDir: string) {
  const resolvedURL = new URL(path, document.baseURI);
  if (resolvedURL.origin === location.origin) {
    const params = new URLSearchParams();
    params.set('file', srcDir + resolvedURL.pathname);
    fetch('/__open-in-editor?' + params.toString());
  } else {
    location.href = resolvedURL.href;
  }
}

export class HTMLWebWidgetInspectorElement extends HTMLElement {
  get dir() {
    return this.getAttribute('dir') || '';
  }

  set dir(value: string) {
    this.setAttribute('dir', value);
  }

  get keys() {
    return JSON.parse(this.getAttribute('keys') || '[]');
  }

  set keys(value: string[]) {
    this.setAttribute('keys', JSON.stringify(value));
  }

  #pressedKeys: Set<string> = new Set();
  #hoveredElement?: HTMLElement;

  #addKeysHandleEvent(event: KeyboardEvent) {
    this.#pressedKeys.add(event.code);
    this.#updateOverlay();
  }

  #deleteKeysHandleEvent(event: KeyboardEvent) {
    this.#pressedKeys.delete(event.code);
    this.#updateOverlay();
  }

  #clearKeysHandleEvent() {
    this.#pressedKeys.clear();
    this.#updateOverlay();
  }

  #hoveredHandleEvent(event: MouseEvent) {
    const target = findContainer(event.target as HTMLElement);
    if (target) {
      this.#hoveredElement = target;
    } else {
      this.#hoveredElement = undefined;
    }
    this.#updateOverlay();
  }

  #clickHandEvent(event: MouseEvent) {
    if (this.#isActive()) {
      this.#pressedKeys.clear();
      const target = findContainer(event.target as HTMLElement);
      const inspectUrl = target?.getAttribute('import');
      if (inspectUrl) {
        event.preventDefault();
        document.body.style.setProperty('cursor', 'progress');
        openInEditor(inspectUrl, this.dir);
      }
    }
  }

  #updateOverlayHandEvent() {
    this.#updateOverlay();
  }

  #isActive() {
    const activeKeys = Array.from(this.#pressedKeys).map((key) =>
      key ? key.replace(/(Left|Right)$/g, '') : undefined
    );
    return this.keys.every((key) => activeKeys.includes(key));
  }

  #updateOverlay() {
    let overlay = this.querySelector(
      'web-widget-inspector-overlay'
    ) as HTMLElement;

    if (!overlay) {
      overlay = document.createElement('web-widget-inspector-overlay');
      overlay.setAttribute('aria-hidden', 'true');
      this.appendChild(overlay);
    }

    if (this.#hoveredElement && this.#isActive()) {
      const rect = findBox(this.#hoveredElement).getBoundingClientRect();
      overlay.style.setProperty('height', rect.height + 'px');
      overlay.style.setProperty('width', rect.width + 'px');
      overlay.style.setProperty('top', rect.top + 'px');
      overlay.style.setProperty('left', rect.left + 'px');
      overlay.style.setProperty('visibility', 'visible');
      document.body.style.setProperty('cursor', 'pointer');
    } else {
      overlay.style.setProperty('height', '0px');
      overlay.style.setProperty('width', '0px');
      overlay.style.setProperty('visibility', 'hidden');
      document.body.style.removeProperty('cursor');
    }
  }

  #showInfo() {
    console.debug(
      '%c ⇱ Web Widget Click-To-Source ',
      'background: linear-gradient(315deg,#afd760 25%,#0074a6); color: white; padding: 2px 3px; border-radius: 2px; font-size: 0.8em;',
      'Hold-press the ' +
        this.keys.join(' + ') +
        ' key' +
        ((this.keys.length > 1 && 's') || '') +
        ' and click a component to jump directly to the source code in your IDE!'
    );
  }

  connectedCallback() {
    const hotKeys = this.keys;

    this.#showInfo();

    this.appendChild(
      Object.assign(document.createElement('style'), {
        textContent: this.styles,
      })
    );

    this.appendChild(
      Object.assign(document.createElement('web-widget-inspector-info'), {
        textContent: 'Click-to-Source: ' + hotKeys.join(' + '),
      })
    );

    document.addEventListener('keydown', this.#addKeysHandleEvent.bind(this), {
      capture: true,
    });

    document.addEventListener('keyup', this.#deleteKeysHandleEvent.bind(this), {
      capture: true,
    });

    window.addEventListener('blur', this.#clearKeysHandleEvent.bind(this), {
      capture: true,
    });

    document.addEventListener(
      'mouseover',
      this.#hoveredHandleEvent.bind(this),
      { capture: true }
    );

    document.addEventListener('click', this.#clickHandEvent.bind(this), {
      capture: true,
    });

    document.addEventListener(
      'contextmenu',
      this.#clearKeysHandleEvent.bind(this),
      { capture: true }
    );

    window.addEventListener('resize', this.#updateOverlayHandEvent.bind(this));

    document.addEventListener(
      'scroll',
      this.#updateOverlayHandEvent.bind(this)
    );
  }

  styles = `
  web-widget-inspector {
    display: contents;
  }

  web-widget-inspector-overlay {
    position: fixed;
    background: repeating-linear-gradient(
      45deg,
      rgba(68, 206, 246, 0.5),
      rgba(68, 206, 246, 0.5) 5px,
      rgba(255, 255, 255, 0.5) 5px,
      rgba(255, 255, 255, 0.5) 10px
    );
    pointer-events: none;
    box-sizing: border-box;
    border: 1px solid rgba(68, 206, 246, 0.9);
    contain: strict;
    cursor: pointer;
    z-index: 999999;
  }

  web-widget-inspector-info {
    position: fixed;
    bottom: 10px;
    right: 10px;
    font-family: monospace;
    background: #000000c2;
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    box-shadow:
      0 20px 25px -5px rgb(0 0 0 / 34%),
      0 8px 10px -6px rgb(0 0 0 / 24%);
    backdrop-filter: blur(4px);
    animation: fadeOut 0.3s 3s ease-in-out forwards;
    z-index: 999999;
    contain: layout;
  }

  @keyframes fadeOut {
    0% {
      opacity: 1;
    }

    100% {
      opacity: 0;
      visibility: hidden;
    }
  }`;
}

customElements.define('web-widget-inspector', HTMLWebWidgetInspectorElement);
