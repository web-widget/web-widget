import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import BaseLayout from '../(components)/BaseLayout.tsx';
import shared from '../(components)/shared.module.css';

interface Params {
  name: string;
}

export const meta = defineMeta({
  title: '动态路由 - Web Widget',
});

export default defineRouteComponent<null, Params>(function Page({ params }) {
  const { name } = params;
  return (
    <BaseLayout>
      <div className={shared.container}>
        <h1 className={shared.pageTitle}>🎯 动态路由</h1>

        <div className={`${shared.highlight} ${shared.info}`}>
          <h2>基于文件系统的动态路由处理</h2>
          <p>Web Widget 使用文件系统路由，支持动态参数捕获。</p>
        </div>

        <div className={`${shared.infoPanel} ${shared.success}`}>
          <h3 className={shared.subsectionTitle}>👋 问候</h3>
          <p style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
            你好，<strong>{name}</strong>！
          </p>
          <p className={shared.textMuted} style={{ fontSize: '0.875rem' }}>
            当前 URL 中的动态参数 <code>[name]</code> 的值为：
            <code>{name}</code>
          </p>
        </div>

        <div className={shared.mb6}>
          <h3 className={shared.sectionTitle}>尝试其他示例</h3>
          <div className={`${shared.grid} ${shared.grid3}`}>
            <a
              href="/examples/params/react"
              className={`${shared.card} ${shared.cardHover}`}
              style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className={shared.textCenter}>
                <div className={shared.cardIcon}>⚛️</div>
                <div className={shared.cardTitle}>React</div>
              </div>
            </a>
            <a
              href="/examples/params/vue"
              className={`${shared.card} ${shared.cardHover}`}
              style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className={shared.textCenter}>
                <div className={shared.cardIcon}>💚</div>
                <div className={shared.cardTitle}>Vue</div>
              </div>
            </a>
            <a
              href="/examples/params/developer"
              className={`${shared.card} ${shared.cardHover}`}
              style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className={shared.textCenter}>
                <div className={shared.cardIcon}>👨‍💻</div>
                <div className={shared.cardTitle}>Developer</div>
              </div>
            </a>
          </div>
        </div>

        <div className={shared.mb6}>
          <h3 className={shared.sectionTitle}>实现方式</h3>
          <pre className={shared.codeBlock}>
            {`// 文件路径: routes/params/[name]@route.tsx
import { defineRouteComponent } from '@web-widget/helpers';

interface Params {
  name: string; // 从 [name] 文件名中提取
}

export default defineRouteComponent<null, Params>(
  function Page({ params }) {
    const { name } = params; // 自动解析的动态参数
    
    return (
      <div>
        <h1>你好，{name}！</h1>
      </div>
    );
  }
);`}
          </pre>
        </div>
      </div>
    </BaseLayout>
  );
});
