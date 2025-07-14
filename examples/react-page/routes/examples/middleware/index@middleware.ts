import { defineMiddlewareHandler, mergeMeta } from '@web-widget/helpers';

// 演示中间件：添加请求处理时间和安全头部
export const handler = defineMiddlewareHandler(
  async function middlewareDemo(context, next) {
    const startTime = Date.now();

    // 在请求开始时记录时间
    context.state.requestStart = startTime;

    // 如果当前路由是页面，那么会有元数据对象，中间件可以在这里添加默认值
    // 修改页面元数据
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

    // 计算处理时间
    const processingTime = Date.now() - startTime;

    // 添加自定义响应头部
    response.headers.set('X-Processing-Time', `${processingTime}ms`);
    response.headers.set(
      'X-Request-ID',
      `req-${startTime}-${Math.random().toString(36).substr(2, 9)}`
    );
    response.headers.set('X-Powered-By', 'Web Widget Middleware Demo');

    // 添加安全相关的响应头
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 添加演示用的服务器计时信息
    response.headers.set(
      'Server-Timing',
      `middleware;dur=${processingTime};desc="Middleware Demo Processing"`
    );

    return response;
  }
);
