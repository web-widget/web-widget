import {
  defineMiddlewareHandler,
  mergeMeta,
  type LinkDescriptor,
  type StyleDescriptor,
} from '@web-widget/helpers';

declare module '@web-widget/schema' {
  interface RouteConfig {
    inlineStyles?: boolean;
  }
}

export type InlineStylesOptions = {
  filter?: (href: string) => boolean;
};

export default function inlineStyles(options: InlineStylesOptions = {}) {
  return defineMiddlewareHandler(
    async function inlineStylesMiddleware(context, next) {
      const inlineStyles = context.module?.config?.inlineStyles ?? true;
      if (!context.meta || !inlineStyles) {
        return next();
      }

      const filter = options.filter ?? (() => true);
      const meta = mergeMeta(context.meta, {});
      const cssLinks: LinkDescriptor[] = [];

      if (meta.link) {
        meta.link = meta.link.filter((link) => {
          if (link.rel === 'stylesheet' && link.href && filter(link.href)) {
            cssLinks.push(link);
            return false;
          } else {
            return true;
          }
        });
      }

      const styles: StyleDescriptor[] = await Promise.all(
        cssLinks.map(async (link) => {
          const href = new URL(link.href!, context.request.url).href;
          const response = await fetch(href!);

          if (!response.ok) {
            throw new Error(`Request failed: ${href}`);
          }

          const content = await response.text();

          return {
            content,
            media: link.media,
            'data-src': href,
          };
        })
      );
      meta.style ??= [];
      meta.style.push(...styles);
      // eslint-disable-next-line no-param-reassign
      context.meta = meta;

      return next();
    }
  );
}
