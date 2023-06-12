import type { Application, Meta, ServerRenderContext, ServerRenderErrorContext, ServerRenderResult } from './types.js';
import { createContextResponse, isContextRequest } from './context.js'


const renderWidget = async (application: Application, renderContext: ServerRenderContext) => {
  const { render, component = application.default  } = application;
  renderContext.component = component;
  return await render(renderContext);
}

type Config = {
  // renderError: (renderErrorContext: ServerRenderErrorContext) => Promise<Response>
  renderLayout: (renderResult: ServerRenderResult, renderContext: ServerRenderContext) => Promise<Response>
}

export const render = async (
  application: Application,
  renderContext: ServerRenderContext | ServerRenderErrorContext,
  config: Config
): Promise<Response> => {
  const { handler } = application
  const { request } = renderContext

  if (handler) {
    return handler({
      request,
      async render(context) {
        Object.assign(renderContext, context)
        if (isContextRequest(request)) {
          return createContextResponse(context);
        }

        return config.renderLayout(await renderWidget(application, renderContext), renderContext)
      }
    })
  } else if (isContextRequest(request)) {
    return createContextResponse({});
  }

  return config.renderLayout(await renderWidget(application, renderContext), renderContext)
}
