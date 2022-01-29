/* eslint-disable no-restricted-globals */
/* global HTMLElement, location, document, customElements, setTimeout, clearTimeout */
import { history } from './history.js';
import { matchRoutes, makeTrashable, reasonableTime } from './utils.js';
import { shouldCancelChangeState, dispatchCustomEvent } from './events.js';

const CHANGE = Symbol('change');
const ROUTES = Symbol('routes');
const RENDER = Symbol('render');
const UNLOAD = Symbol('unload');
const ACTIVE_URL = Symbol('active-url');
const INACTIVE_ELEMENTS = Symbol('inactive-elements');
const RENDER_PROGRESS = Symbol('render-progress');

export class HTMLWebRouterElement extends HTMLElement {
  /**
   * Router looks for a web-outlet tag for updating the views on history updates.
   * Example:
   *
   * <web-router>
   *  <web-outlet>
   *    <!-- All DOM update will be happening here on route change -->
   *  </web-outlet>
   * </web-router>
   */
  get outlet() {
    const outlet = this.querySelector('web-outlet');

    if (!outlet) {
      const outlet = document.createElement('outlet');
      this.appendChild(outlet);
    }

    return outlet;
  }

  /**
   * Get all routes from the direct web-route child element.
   * The document title can be updated by providing an
   * title attribute to the web-route tag
   */
  get routes() {
    if (this[ROUTES]) {
      return this[ROUTES];
    }
    const getRoutes = context => {
      const routes = [];
      const ignore = ['path', 'element'];

      for (const node of context.children) {
        if (node.localName === 'web-route') {
          routes.push({
            $pathMatch: null,
            path: node.path,
            element: node.element || 'div',
            // children: getRoutes(node),
            attributes: [...node.attributes].reduce(
              (accumulator, { name, value }) => {
                if (!ignore.includes(name)) {
                  accumulator[name] = value;
                }
                return accumulator;
              },
              {}
            )
          });
        }
      }

      return routes;
    };

    this[ROUTES] = getRoutes(this);
    return this[ROUTES];
  }

  connectedCallback() {
    const change = () => {
      this[CHANGE](location.pathname);
    };
    this.$$unlisten = history.listen(change);
    const matchedRoute = this.match(location.pathname);
    const SSR =
      matchedRoute &&
      this.outlet.querySelector(
        `${matchedRoute.element}[route-path="${matchedRoute.path}"]`
      );

    if (SSR) {
      this[ACTIVE_URL] = location.pathname;
    } else {
      change();
    }
  }

  disconnectedCallback() {
    this.$$unlisten();
  }

  createElement(route) {
    const element = document.createElement(route.element, {
      is: route.attributes.is
    });
    const template = this.querySelector(
      `web-route[path="${route.path}"] template`
    );

    Object.entries(route.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });

    if (template) {
      element.appendChild(template.content.cloneNode(true));
    }

    return element;
  }

  match(to) {
    return matchRoutes(this.routes, to);
  }

  async [CHANGE](to) {
    if (this[ACTIVE_URL] !== to) {
      const matchedRoute = this.match(to);

      // TODO matchedRoute === null
      if (matchedRoute && !shouldCancelChangeState()) {
        this[ACTIVE_URL] = to;
        this.activeRoute = matchedRoute;
        dispatchCustomEvent('navigationstart');
        try {
          await this.render(matchedRoute);
        } catch (error) {
          dispatchCustomEvent('navigationerror');
          throw error;
        }
        dispatchCustomEvent('navigationend');
      }
    }
  }

  get [INACTIVE_ELEMENTS]() {
    const inactiveElements = [...this.outlet.children];
    const pop = inactiveElements.pop();

    if (pop && pop.getAttribute('route-path') !== this.activeRoute.path) {
      inactiveElements.push(pop);
    }

    return inactiveElements;
  }

  // eslint-disable-next-line class-methods-use-this
  async [UNLOAD](inactiveElements) {
    await Promise.all(
      inactiveElements.map(async element => {
        if (element.unload) {
          await element.unload();
        }
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      })
    );
  }

  readerProgress(progress) {
    if (progress === 0) {
      // Simulate the white screen effect of slow browser switching
      clearTimeout(this[RENDER_PROGRESS]);
      this[RENDER_PROGRESS] = setTimeout(() => {
        this[INACTIVE_ELEMENTS].forEach(element => {
          element.hidden = true;
        });
      }, 4000);
    } else if (progress === 1) {
      clearTimeout(this[RENDER_PROGRESS]);
    }
  }

  async render(route) {
    if (this[RENDER]) {
      this[RENDER].trash();
    }

    this.readerProgress(0);

    // Wait for the custom element to be registered
    const elementName = route.attributes.is || route.element;
    if (elementName.includes('-')) {
      await (this[RENDER] = makeTrashable(
        reasonableTime(customElements.whenDefined(elementName), 3000)
      ));
      this.readerProgress(0.2);
    }

    // Create custom element
    const element = this.createElement(route);
    element.setAttribute('inactive', '');
    element.setAttribute('route-path', route.path);
    element.setAttribute(
      'route-params',
      JSON.stringify(route.$pathMatch.params)
    );
    element.router = {
      history,
      location: history.location
    };
    element.route = {
      // path: route.path,
      params: route.$pathMatch.params
    };
    this.outlet.appendChild(element);

    // Prefetch next widget file
    if (element.load) {
      await (this[RENDER] = makeTrashable(element.load()));
      this.readerProgress(0.3);
    }

    // Display widget title
    if (element.title) {
      document.title = element.title;
    }

    // Initialize the next widget
    if (element.bootstrap) {
      await (this[RENDER] = makeTrashable(element.bootstrap()));
      this.readerProgress(0.8);
    }

    // Unload widget
    if (this[INACTIVE_ELEMENTS].length) {
      await (this[RENDER] = makeTrashable(
        reasonableTime(this[UNLOAD](this[INACTIVE_ELEMENTS]), 1000, true)
      ));
      this.readerProgress(0.9);
    }

    // Mount next widget
    if (element.mount) {
      await (this[RENDER] = makeTrashable(element.mount()));
    }

    this.readerProgress(1);

    delete this[RENDER];
    element.removeAttribute('inactive');
  }
}

customElements.define('web-router', HTMLWebRouterElement);
