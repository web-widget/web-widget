import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import BaseLayout from '../(components)/BaseLayout';
import Echo from './Echo@widget';
import shared from '../(components)/shared.module.css';

export const meta = defineMeta({
  title: '服务器操作 - Web Widget',
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <div className={shared.container}>
        <h1 className={shared.pageTitle}>⚡ 服务器操作</h1>

        <div className={`${shared.highlight} ${shared.info}`}>
          <h2>从客户端直接调用服务器端函数</h2>
          <p>
            服务器操作允许您直接从客户端组件运行服务器端函数，
            在前端和后端代码之间建立无缝桥梁。
          </p>
        </div>

        <div className={shared.mb6}>
          <h3 className={shared.sectionTitle}>核心特性</h3>
          <div className={`${shared.grid} ${shared.grid3}`}>
            <div className={shared.card}>
              <div className={shared.cardIcon}>🔒</div>
              <h4 className={shared.cardTitle}>类型安全</h4>
              <p className={shared.cardDescription}>
                TypeScript 类型检查覆盖客户端到服务器的完整调用链
              </p>
            </div>
            <div className={shared.card}>
              <div className={shared.cardIcon}>🔄</div>
              <h4 className={shared.cardTitle}>自动序列化</h4>
              <p className={shared.cardDescription}>
                自动处理参数和返回值的序列化，无需手动转换
              </p>
            </div>
            <div className={shared.card}>
              <div className={shared.cardIcon}>📞</div>
              <h4 className={shared.cardTitle}>直接调用</h4>
              <p className={shared.cardDescription}>
                像调用本地函数一样调用服务器函数，无需编写 API 路由
              </p>
            </div>
          </div>
        </div>

        <div className={shared.mb6}>
          <h3 className={shared.sectionTitle}>代码示例</h3>
          <div className={shared.mb4}>
            <h4 className={shared.subsectionTitle}>
              1. 定义服务器函数 (functions@action.ts)
            </h4>
            <pre className={shared.codeBlock}>
              {`export async function echoMessage(message: string) {
  // 服务器端处理逻辑
  return {
    original: message,
    echo: \`服务器回显: \${message}\`,
    timestamp: new Date().toISOString(),
    server: 'Web Widget Server'
  };
}`}
            </pre>
          </div>

          <div className={shared.mb4}>
            <h4 className={shared.subsectionTitle}>
              2. 客户端调用 (Echo@widget.tsx)
            </h4>
            <pre className={shared.codeBlock}>
              {`import { echoMessage } from './functions@action';

export default function Echo() {
  const handleSubmit = async (message: string) => {
    // 直接调用服务器函数
    const result = await echoMessage(message);
    console.log(result); // 类型安全的结果
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}`}
            </pre>
          </div>
        </div>

        <div className={`${shared.infoPanel} ${shared.success}`}>
          <h3 className={shared.subsectionTitle}>交互演示</h3>
          <p>
            在下方输入一些文本。点击"发送到服务器"后，文本将被发送到服务器端函数进行处理，
            并返回包含时间戳和服务器信息的响应。
          </p>
          <div style={{ marginTop: '1.5rem' }}>
            <Echo />
          </div>
        </div>

        <div className={shared.comparison}>
          <h3 className={`${shared.subsectionTitle} ${shared.textCenter}`}>
            与传统 API 的对比
          </h3>
          <div className={shared.comparisonGrid}>
            <div className={shared.comparisonItem}>
              <h4
                className={shared.cardTitle}
                style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>
                传统 REST API
              </h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>❌ 需要创建独立的 API 路由</li>
                <li>⚙️ 手动处理请求/响应序列化</li>
                <li>🔄 客户端和服务端类型容易不同步</li>
                <li>🛠️ 需要额外的错误处理和状态管理</li>
                <li>🔗 URL 路径和参数容易出错</li>
              </ul>
            </div>
            <div className={shared.comparisonItem}>
              <h4
                className={shared.cardTitle}
                style={{ color: 'var(--color-success)', marginBottom: '1rem' }}>
                Web Widget 服务器操作
              </h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>✅ 函数即 API，无需额外路由</li>
                <li>⚡ 自动序列化，无需手动转换</li>
                <li>🔒 完整的 TypeScript 类型安全</li>
                <li>🎯 内置加载和错误状态</li>
                <li>📞 像本地函数一样直接调用</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
});
