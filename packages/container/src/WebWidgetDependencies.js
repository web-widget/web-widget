/* global window */

/**
 * @summary Web Widget Dependency Injection
 */
export class WebWidgetDependencies {
  constructor(ownerElement) {
    /**
     * Owner element
     * @name ownerElement
     * @type {HTMLWebWidgetElement}
     */
    Reflect.defineProperty(this, 'ownerElement', {
      get() {
        return ownerElement;
      }
    });
  }

  /**
   * Render target
   * @type {HTMLElement}
   */
  get container() {
    const view = this.ownerElement;

    if (!view.renderRoot) {
      view.renderRoot = view.createRenderRoot();
      ['mount', 'update', 'unmount'].forEach(name => {
        if (!view.renderRoot[name]) {
          view.renderRoot[name] = properties => view[name](properties);
        }
      });
    }

    return view.renderRoot;
  }

  /**
   * Application data
   * @type {(object|array)}
   */
  get data() {
    return this.ownerElement.data;
  }

  set data(value) {
    this.ownerElement.data = value;
  }

  /**
   * Application environment variables
   * @type {object}
   */
  get env() {
    return [...this.ownerElement.attributes].reduce(
      (accumulator, { name, value }) => {
        accumulator[name] = value;
        return accumulator;
      },
      Object.create(null)
    );
  }
}

window.WebWidgetDependencies = WebWidgetDependencies;
