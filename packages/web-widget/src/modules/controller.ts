import type {
  ClientWidgetRenderContext as WidgetRenderContext,
  ClientWidgetRenderResult as WidgetRenderResult,
  ClientWidgetModule as WidgetModule,
} from '@web-widget/helpers';
import { rebaseMeta, mergeMeta } from '@web-widget/helpers';
import type { Loader } from '../types';

import { status } from './status';
import { reasonableTime } from './timeouts';
import { rules } from './flow';

interface LifecycleControllerOptions {
  handler: () => {
    importer: string;
    context: WidgetRenderContext;
  };
  statusChangeCallback: (status: string) => void;
  timeouts: Record<string, number>;
}

export class LifecycleController {
  constructor(moduleLoader: Loader, options: LifecycleControllerOptions) {
    this.#moduleLoader = moduleLoader;
    this.#handler = options.handler;
    this.#lifecycle = Object.create(null);
    this.#status = status.INITIAL;
    this.#statusChangeCallback = options.statusChangeCallback;
    this.#timeouts = options.timeouts;
  }

  #moduleLoader;

  #handler;

  #lifecycle: WidgetRenderResult;

  #pending?: Promise<void> | null;

  #statusChangeCallback: (value: string) => void;

  #timeouts: Record<string, number>;

  #status: string;

  #setStatus(value: string) {
    if (value !== this.#status) {
      this.#status = value;
      this.#statusChangeCallback(value);
    }
  }

  get status() {
    return this.#status;
  }

  async run(name: string) {
    let importer: string;
    const bail = typeof this.#timeouts[name] === 'number';
    // @ts-ignore
    const rule = rules[name];
    const timeout = bail ? this.#timeouts[name] : rule.timeout;

    const [initial, pending, fulfilled, rejected] = rule.status;

    if (!rule) {
      throw new TypeError(`Cannot ${name}`);
    }

    if (this.#pending) {
      await this.#pending;
    }

    // @ts-ignore
    if (rule.creator && !this.#lifecycle[name]) {
      //@ts-ignore
      this.#lifecycle[name] = async (context: WidgetRenderContext) => {
        const widgetModule = (await this.#moduleLoader()) as WidgetModule;
        const render = widgetModule.render;

        if (!render) {
          throw new Error(`Module does not export render function.`);
        }

        const meta = rebaseMeta(
          mergeMeta(
            (widgetModule as WidgetModule).meta ?? {},
            context.meta ?? {}
          ),
          importer
        );

        if (meta.script?.length) {
          console.warn(`Script tags in meta will be ignored.`);
        }

        let body: Element | DocumentFragment;
        const styleLinks = meta.link
          ? meta.link.filter(({ rel }) => rel === 'stylesheet')
          : [];
        const styles = meta.style ?? [];
        const hasStyle = styleLinks.length ?? styles.length;
        const renderContext: WidgetRenderContext = Object.freeze({
          children: undefined, // TODO
          get container() {
            const tag = 'web-widget.body';
            return (
              body ??
              (body = hasStyle
                ? context.recovering
                  ? (context.container.querySelector(tag.replace('.', '\\.')) ??
                    context.container)
                  : context.container.appendChild(document.createElement(tag))
                : context.container)
            );
          },
          data: context.data,
          meta,
          module: widgetModule,
          recovering: context.recovering,
          /**@deprecated*/
          update: Reflect.get(context, 'update'),
        });

        const lifecycle: WidgetRenderResult = await render(renderContext);

        Object.assign(
          // @ts-ignore
          this.#lifecycle,
          {
            bootstrap() {
              if (!hasStyle && !context.recovering) {
                return;
              }

              const fragment = document.createDocumentFragment();
              const loading = styleLinks.map(
                (attrs) =>
                  new Promise((resolve, reject) => {
                    const element = document.createElement('link');
                    element.addEventListener('load', resolve, {
                      once: true,
                    });
                    element.addEventListener('error', reject, {
                      once: true,
                    });
                    Object.entries(attrs).forEach(([name, value]) => {
                      element.setAttribute(name, value);
                    });
                    fragment.appendChild(element);
                  })
              );

              styles.forEach((attrs) => {
                const element = document.createElement('style');
                element.textContent = attrs.content ?? '';
                Object.entries(attrs).forEach(([name, value]) => {
                  element.setAttribute(name, value);
                });
                fragment.appendChild(element);
              });

              context.container.appendChild(fragment);

              return Promise.all(loading);
            },
          },
          lifecycle ?? {}
        );
      };
    }

    if (initial !== this.#status && rule.pre) {
      await this.run(rule.pre);
    }

    if (![initial, rejected].includes(this.#status)) {
      if (rule.verify) {
        throw new Error(`Cannot ${name}: status: ${this.#status}`);
      }
      return undefined;
    }

    this.#setStatus(pending);

    //@ts-ignore
    if (!this.#lifecycle[name]) {
      this.#setStatus(fulfilled);
      return undefined;
    }

    this.#pending = reasonableTime(
      async () => {
        const { context, importer: baseUrl } = this.#handler();
        importer = baseUrl;
        //@ts-ignore
        return this.#lifecycle[name](context);
      },
      timeout,
      bail,
      `Lifecycle function did not complete within ${timeout} ms: ${name}`
    )
      .then(() => {
        this.#setStatus(fulfilled);
        this.#pending = null;
      })
      .catch((error) => {
        this.#setStatus(rejected);
        this.#pending = null;
        throw error;
      });

    return this.#pending;
  }
}
