import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import ReactCounter from '../(components)/Counter@widget.tsx';
import BaseLayout from '../(components)/BaseLayout.tsx';
import VueCounter from '../(components)/Counter@widget.vue';
import { toReact } from '@web-widget/vue';
import shared from '../(components)/shared.module.css';

const RVueCounter = toReact(VueCounter);

export const meta = defineMeta({
  title: '挂件 - Web Widget',
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <div className={shared.container}>
        <h1 className={shared.pageTitle}>🍀 挂件</h1>

        <div className={`${shared.highlight} ${shared.info}`}>
          <h2>React 与 Vue 组件在同一页面中协作</h2>
          <p>
            Web Widget 的核心特性之一是支持多个前端框架在同一个应用中无缝共存。
            以下演示展示了 React 和 Vue 组件如何在同一页面中协同工作。
          </p>
        </div>

        <div className={shared.mb6}>
          <h3 className={shared.sectionTitle}>框架共存演示</h3>
          <div className={`${shared.grid} ${shared.grid2}`}>
            <div className={shared.card}>
              <h4 className={shared.cardTitle}>React 计数器</h4>
              <p className={shared.cardDescription}>
                使用 React 19 和现代 Hooks 实现的计数器组件
              </p>
              <div className={shared.mt3}>
                <ReactCounter count={0} variant="react" />
              </div>
            </div>

            <div className={shared.card}>
              <h4 className={shared.cardTitle}>Vue 计数器</h4>
              <p className={shared.cardDescription}>
                使用 Vue 3 Composition API 实现的计数器组件
              </p>
              <div className={shared.mt3}>
                <RVueCounter count={0} variant="vue" />
              </div>
            </div>
          </div>

          <div
            className={`${shared.infoPanel} ${shared.success}`}
            style={{ marginTop: '2rem' }}>
            <h4>🎯 实际效果</h4>
            <p>
              注意观察：两个计数器是完全独立的组件，分别使用不同的前端框架实现，
              但它们可以在同一个页面中无缝运行，不会相互冲突。
            </p>
          </div>
        </div>

        <div className={shared.mb6}>
          <h3 className={shared.sectionTitle}>技术特点</h3>
          <div className={`${shared.grid} ${shared.grid3}`}>
            <div className={shared.card}>
              <div className={shared.cardIcon}>🔄</div>
              <h4 className={shared.cardTitle}>自动转换</h4>
              <p className={shared.cardDescription}>
                Vue 组件通过 Vite 自动转换为 React 组件
              </p>
            </div>
            <div className={shared.card}>
              <div className={shared.cardIcon}>⚡</div>
              <h4 className={shared.cardTitle}>同构渲染</h4>
              <p className={shared.cardDescription}>
                两个框架的组件都支持服务器端渲染和客户端 hydration
              </p>
            </div>
            <div className={shared.card}>
              <div className={shared.cardIcon}>🔒</div>
              <h4 className={shared.cardTitle}>类型安全</h4>
              <p className={shared.cardDescription}>
                TypeScript 类型定义确保跨框架组件调用的类型安全
              </p>
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
});
