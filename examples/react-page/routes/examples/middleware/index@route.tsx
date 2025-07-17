import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import BaseLayout from '../(components)/BaseLayout.tsx';
import shared from '../(components)/shared.module.css';

export const meta = defineMeta({
  title: '中间件 - Web Widget',
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <div className={shared.container}>
        <h1 className={shared.pageTitle}>🧅 中间件</h1>

        <div className={`${shared.highlight} ${shared.info}`}>
          <h2>Web Widget 中间件系统</h2>
          <p>
            中间件是 Web Widget
            路由系统的核心组件，允许您在请求处理管道中插入自定义逻辑。
            这个页面通过中间件动态修改了页面元数据，展示了中间件的强大能力。
          </p>
        </div>

        <div className={shared.mb6}>
          <h3 className={shared.sectionTitle}>响应头部演示</h3>
          <div className={`${shared.infoPanel} ${shared.warning}`}>
            <h4>⚙️ 动态修改的请求头</h4>
            <p>
              这个页面的中间件还添加了自定义响应头部。您可以通过浏览器开发者工具观察：
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
              <li>
                <strong>Network 面板</strong>：查看 <code>X-Powered-By</code>{' '}
                演示标头
              </li>
            </ul>
          </div>
        </div>

        <div className={shared.mb6}>
          <h3 className={shared.sectionTitle}>页面元数据操作演示</h3>
          <div className={`${shared.infoPanel} ${shared.success}`}>
            <h4>🔧 动态修改的页面元数据</h4>
            <p>
              当前页面的 <code>&lt;meta&gt;</code>{' '}
              标签和脚本都是通过中间件动态修改的：
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
              <li>
                <strong>描述信息</strong>：动态添加了SEO友好的页面描述
              </li>
              <li>
                <strong>关键词</strong>：注入了"middleware, web widget,
                demo"等关键词
              </li>
              <li>
                <strong>动态脚本</strong>
                ：注入了一段JavaScript代码（检查浏览器控制台）
              </li>
            </ul>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
});
