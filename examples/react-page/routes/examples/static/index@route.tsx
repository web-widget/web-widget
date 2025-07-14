import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import BaseLayout from '../(components)/BaseLayout.tsx';
import shared from '../(components)/shared.module.css';
import styles from './index.module.css';

export const meta = defineMeta({
  title: '静态页面 - Web Widget',
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <div className={shared.container}>
        <h1 className={shared.pageTitle}>📄 静态页面</h1>

        <div className={`${shared.highlight} ${shared.info}`}>
          <h2>纯静态 HTML，无需客户端 JavaScript</h2>
          <p>
            当前页面是纯静态 HTML，无需任何客户端交互。
            这意味着我们不需要加载任何 JavaScript 代码。
          </p>
        </div>

        <div className={shared.mb6}>
          <h3 className={shared.subsectionTitle}>特点与优势</h3>
          <ul className={shared.featureList}>
            <li>
              <strong>快速加载</strong> - 无需等待 JavaScript 下载和执行
            </li>
            <li>
              <strong>SEO 友好</strong> - 搜索引擎可以直接索引完整内容
            </li>
            <li>
              <strong>低资源消耗</strong> - 减少客户端计算和电池消耗
            </li>
            <li>
              <strong>高可用性</strong> - 即使 JavaScript 被禁用也能正常显示
            </li>
          </ul>
        </div>

        <div className={styles.demoList}>
          <h3 className={shared.subsectionTitle}>验证方式</h3>
          <p>你可以通过以下方式验证这是纯静态页面：</p>
          <ol>
            <li>右键查看页面源代码 - 内容已完全渲染在 HTML 中</li>
            <li>
              打开开发者工具的 Network 面板并刷新页面 - 没有额外的 JavaScript
              请求
            </li>
            <li>禁用 JavaScript 后刷新页面 - 内容依然完整显示</li>
          </ol>
        </div>

        <div className={shared.mb6}>
          <h3 className={shared.subsectionTitle}>实现方式</h3>
          <p className={shared.textMuted}>
            这个页面使用 <code>defineRouteComponent</code> 创建：
          </p>
          <pre className={shared.codeBlock}>
            {`export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>静态页面内容</h1>
      {/* 纯静态内容，无客户端交互 */}
    </BaseLayout>
  );
});`}
          </pre>
        </div>
      </div>
    </BaseLayout>
  );
});
