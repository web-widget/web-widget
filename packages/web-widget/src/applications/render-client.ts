import type { Application, Application_v0, ClientRenderErrorContext, ClientRenderContext, ClientRenderResult } from './types.js';
import { getContext } from './context.js'

const renderWidget = async (application: Application | Application_v0, renderContext: ClientRenderContext): Promise<ClientRenderResult> => {
  if (Reflect.has(application, 'render')) {
    // v1
    const { render, component = application.default  } = application as Application;
    renderContext.component = component;
    return render(renderContext);
  } else {
    // v0
    const render = (application as Application_v0).default;
    if (typeof render === 'function') {
      return render(renderContext);
    } else {
      // support single-spa app
      return application as ClientRenderResult;
    }
  }
};

export const render = async (
  application: Application | Application_v0,
  renderContext: ClientRenderContext | ClientRenderErrorContext
): Promise<ClientRenderResult> => {
  const isV0 = !Reflect.has(application, 'render');
  const { handler } = (application as Application);

  if (handler && !renderContext.recovering) {
    return handler({
      request: renderContext.request,
      async render(context){
        Object.assign(renderContext, context)
        return renderWidget(application, renderContext)
      }
    })
  }
  
  // if (!isV0) {
  //   const resp = await getContext(renderContext.request.url);
  //   Object.assign(renderContext,  await resp.json());
  // } 

  return renderWidget(application, renderContext)
}
