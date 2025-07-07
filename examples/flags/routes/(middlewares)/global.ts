import {
  defineMiddlewareHandler,
  composeMiddleware,
} from '@web-widget/helpers';
import { createHandle } from '@web-widget/helpers/flags';
import * as flags from '#config/flags';

const poweredByMiddleware = defineMiddlewareHandler(
  async function poweredBy(ctx, next) {
    ctx.state.test = 'hello world';
    const resp = await next();
    resp.headers.set('X-Powered-By', '@web-widget/web-router');

    return resp;
  }
);

const flagsMiddleware = createHandle({
  flags,
  secret: process.env.FLAGS_SECRET,
});

export default composeMiddleware([poweredByMiddleware, flagsMiddleware]);
