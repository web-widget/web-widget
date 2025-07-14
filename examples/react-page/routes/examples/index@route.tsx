import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import ReactCounter from './(components)/Counter@widget.tsx';
import BaseLayout from './(components)/BaseLayout.tsx';
import styles from './index.module.css';
import shared from './(components)/shared.module.css';

export const meta = defineMeta({
  title: 'Web Widget - 欢迎',
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <div className={shared.container}>
        {/* Hero Section */}
        <div className={styles.hero}>
          <h1 className={shared.pageTitle}>
            简单、充满力量<br></br>技术栈中立的应用框架
          </h1>
          <p className={styles.subtitle}>
            建立在 Web 标准之上、跨平台、可驱动多种前端 UI 框架
          </p>

          <div className={styles.heroDemo}>
            <p className={styles.demoIntro}>⚡ 孤岛架构</p>
            <ReactCounter count={0} />
            <p className={styles.demoHint}>仅发送必要的 JavaScript 到客户端</p>
          </div>
        </div>

        {/* Features Section */}
        <div className={shared.mb6}>
          <h2 className={shared.sectionTitle}>基本示例</h2>
          <p
            className={`${shared.textMuted} ${shared.textCenter} ${shared.mb4}`}>
            以下是 Web Widget 核心功能的实际演示，点击即可体验：
          </p>

          <div className={`${shared.grid} ${shared.grid3}`}>
            <a
              className={`${shared.card} ${shared.cardHover} ${shared.linkCard}`}
              href="/examples/static">
              <div className={shared.textCenter}>
                <div className={shared.cardIcon}>📄</div>
                <h3 className={shared.cardTitle}>静态页面</h3>
                <p className={shared.cardDescription}>
                  纯静态 HTML 页面，无需客户端 JavaScript
                </p>
              </div>
            </a>

            <a
              className={`${shared.card} ${shared.cardHover} ${shared.linkCard}`}
              href="/examples/params/web-widget">
              <div className={shared.textCenter}>
                <div className={shared.cardIcon}>🎯</div>
                <h3 className={shared.cardTitle}>动态路由</h3>
                <p className={shared.cardDescription}>
                  基于文件系统的动态路由处理
                </p>
              </div>
            </a>

            <a
              className={`${shared.card} ${shared.cardHover} ${shared.linkCard}`}
              href="/examples/fetch">
              <div className={shared.textCenter}>
                <div className={shared.cardIcon}>🔄</div>
                <h3 className={shared.cardTitle}>数据获取</h3>
                <p className={shared.cardDescription}>
                  在服务器端获取数据并渲染为静态 HTML
                </p>
              </div>
            </a>

            <a
              className={`${shared.card} ${shared.cardHover} ${shared.linkCard}`}
              href="/examples/action">
              <div className={shared.textCenter}>
                <div className={shared.cardIcon}>⚡</div>
                <h3 className={shared.cardTitle}>服务器操作</h3>
                <p className={shared.cardDescription}>
                  从客户端直接调用服务器端函数
                </p>
              </div>
            </a>

            <a
              className={`${shared.card} ${shared.cardHover} ${shared.linkCard}`}
              href="/examples/frameworks">
              <div className={shared.textCenter}>
                <div className={shared.cardIcon}>🍀</div>
                <h3 className={shared.cardTitle}>多框架共存</h3>
                <p className={shared.cardDescription}>
                  React 与 Vue 组件在同一页面无缝协作
                </p>
              </div>
            </a>

            <a
              className={`${shared.card} ${shared.cardHover} ${shared.linkCard}`}
              href="/examples/middleware">
              <div className={shared.textCenter}>
                <div className={shared.cardIcon}>🧅</div>
                <h3 className={shared.cardTitle}>中间件</h3>
                <p className={shared.cardDescription}>
                  强大的中间件管道，支持修改页面元数据、添加响应头等
                </p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
});
