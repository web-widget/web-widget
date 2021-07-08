import { queueMicrotask } from '../src/WebWidget/utils/queueMicrotask.js';

const map = new WeakMap();

function validWidget(widget) {
  if (!widget || !widget.bootstrap || !widget.unmount || !widget.mount) {
    throw new TypeError(`Validation failed: not a WebWidget`);
  }
}

function validFunction(fun) {
  if (typeof fun !== 'function') {
    throw new TypeError(`Validation failed: not a function`);
  }
}

function shouldBeActive(widget, collection, props) {
  const activeWhen = map.get(collection).get(widget);
  try {
    return activeWhen(props);
  } catch (error) {
    queueMicrotask(() => {
      throw error;
    });
    return false;
  }
}

function filterActive(active, collection, props) {
  return [...collection].filter(function (widget) {
    const value = shouldBeActive(widget, collection, props);
    return active ? value : !value;
  });
}

export class WebWidgetCollection extends Set {
  constructor(iterable) {
    super();
    map.set(this, new Map());

    if (iterable) {
      for (const params of iterable) {
        this.add(...params);
      }
    }
  }

  add(widget, activeWhen) {
    validWidget(widget);
    validFunction(activeWhen);

    super.add(widget);
    map.get(this).set(widget, activeWhen);
  }

  delete(widget) {
    validWidget(widget);
    super.delete(widget);
    map.get(this).delete(widget);
  }

  async preload(props) {
    return Promise.all(
      filterActive(true, this, props).map(widget =>
        widget.bootstrap().catch(error => this.catch(error, widget))
      )
    );
  }

  async unload(props) {
    return Promise.all(
      filterActive(false, this, props).map(widget =>
        widget.unmount().catch(error => this.catch(error, widget))
      )
    );
  }

  async load(props) {
    return Promise.all(
      filterActive(true, this, props).map(widget =>
        widget.mount().catch(error => this.catch(error, widget))
      )
    );
  }

  async change(props) {
    await this.preload(props);
    await this.unload(props);
    await this.load(props);
  }

  // eslint-disable-next-line class-methods-use-this
  catch(error) {
    queueMicrotask(() => {
      throw error;
    });
  }
}
