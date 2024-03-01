import { defineMiddlewareHandler } from '@web-widget/helpers';
import { allowExposedToClient } from '@web-widget/helpers/context';

export const handler = defineMiddlewareHandler(
  async function handler(ctx, next) {
    // eslint-disable-next-line no-param-reassign
    ctx.state.test = 'hello wrold';
    allowExposedToClient(ctx.state, ['test']);
    const resp = await next();
    resp.headers.set('X-Powered-By', '@web-widget/web-router');

    return resp;
  }
);
