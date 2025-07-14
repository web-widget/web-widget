import { defineMiddlewareHandler, mergeMeta } from '@web-widget/helpers';

export const handler = defineMiddlewareHandler(
  async function middlewareDemo(context, next) {
    // 如果当前路由是页面，那么会有元数据对象，中间件可以在这里添加默认值
    if (context.meta) {
      context.meta = mergeMeta(context.meta, {
        title: '中间件 - Web Widget',
        description: '这是一个中间件页面...',
        keywords: 'middleware, web widget, demo',
        script: [
          {
            content: 'console.log("中间件动态插入的脚本！");',
          },
        ],
      });
    }

    // 执行下一个中间件/路由处理器
    const response = await next();

    // 添加示例响应头
    response.headers.set('X-Powered-By', 'Web Widget Middleware Example');

    return response;
  }
);
