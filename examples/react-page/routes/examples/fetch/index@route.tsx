import {
  defineMeta,
  defineRouteComponent,
  defineRouteHandler,
} from '@web-widget/helpers';
import type { HelloData } from '../api/hello@route.ts';
import BaseLayout from '../(components)/BaseLayout.tsx';
import shared from '../(components)/shared.module.css';

export const meta = defineMeta({
  title: '数据获取 - Web Widget',
});

export const handler = defineRouteHandler<HelloData>({
  async GET({ request, renderWith }) {
    const url = new URL(request.url);
    const api = `${url.origin}/examples/api/hello`;
    const res = await fetch(api);

    if (!res.ok) {
      throw new Error(`Failed to fetch data from ${api}`);
    }

    const data = (await res.json()) as HelloData;
    return renderWith(data);
  },
});

export default defineRouteComponent<HelloData>(function Page({ data }) {
  return (
    <BaseLayout>
      <div className={shared.container}>
        <h1 className={shared.pageTitle}>🔄 数据获取</h1>

        <div className={`${shared.highlight} ${shared.info}`}>
          <h2>在服务器端获取数据并渲染为静态 HTML</h2>
          <p>
            以下数据在服务器端获取并呈现为静态 HTML。
            无需等待客户端加载和数据请求，内容即时可见。
          </p>
        </div>

        <div className={shared.mb6}>
          <h3 className={shared.sectionTitle}>服务器端数据获取的优势</h3>
          <div className={`${shared.grid} ${shared.grid3}`}>
            <div className={shared.card}>
              <div className={shared.cardIcon}>🔍</div>
              <h4 className={shared.cardTitle}>SEO 优化</h4>
              <p className={shared.cardDescription}>
                搜索引擎可以直接索引完整的数据内容
              </p>
            </div>
            <div className={shared.card}>
              <div className={shared.cardIcon}>📱</div>
              <h4 className={shared.cardTitle}>更好的用户体验</h4>
              <p className={shared.cardDescription}>
                特别适合移动设备和慢网络环境
              </p>
            </div>
            <div className={shared.card}>
              <div className={shared.cardIcon}>🛡️</div>
              <h4 className={shared.cardTitle}>数据安全</h4>
              <p className={shared.cardDescription}>
                敏感的 API 密钥和逻辑只在服务器端运行
              </p>
            </div>
          </div>
        </div>

        <div className={`${shared.infoPanel} ${shared.success}`}>
          <h3 className={shared.subsectionTitle}>演示数据</h3>
          <p>以下数据通过服务器端 API 调用获取：</p>

          <div
            className={`${shared.grid} ${shared.grid2}`}
            style={{ marginTop: '1.5rem' }}>
            {data.map((item, index) => (
              <div key={index} className={shared.card}>
                <h4 className={shared.cardTitle}>{item.title}</h4>
                <p className={shared.textMuted} style={{ margin: 0 }}>
                  数据项 #{index + 1}
                </p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <p>
              <strong>数据源：</strong>
              <a
                href="/examples/api/hello"
                target="_blank"
                className={shared.link}>
                /api/hello
              </a>
            </p>
            <p
              className={shared.textMuted}
              style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              点击上方链接可以查看原始 API 响应数据
            </p>
          </div>
        </div>

        <div className={shared.mb6}>
          <h3 className={shared.sectionTitle}>实现方式</h3>
          <div className={shared.mb4}>
            <h4 className={shared.subsectionTitle}>1. 定义页面处理器</h4>
            <pre className={shared.codeBlock}>
              {`export const handler = defineRouteHandler<HelloData>({
  async GET({ request, renderWidth }) {
    // 在服务器端获取数据
    const res = await fetch(api);
    const data = await res.json();
    
    // 将数据传递给页面组件
    return renderWidth }) {(data);
  },
});`}
            </pre>
          </div>

          <div>
            <h4 className={shared.subsectionTitle}>2. 页面组件接收数据</h4>
            <pre className={shared.codeBlock}>
              {`export default defineRouteComponent<HelloData>(
  function Page({ data }) {
    return (
      <div>
        {data.map(item => (
          <div key={item.id}>{item.title}</div>
        ))}
      </div>
    );
  }
);`}
            </pre>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
});
