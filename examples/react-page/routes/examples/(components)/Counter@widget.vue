<script setup lang="ts">
import { ref, nextTick } from 'vue';

interface CounterProps {
  count: number;
  variant?: 'react' | 'vue';
}

const props = withDefaults(defineProps<CounterProps>(), {
  variant: 'vue'
});

const count = ref(props.count);
const countElement = ref<HTMLElement>();
const isAnimating = ref(false);

const handleCountChange = async (newCount: number) => {
  count.value = newCount;

  // 添加计数变化动画
  if (countElement.value) {
    isAnimating.value = false;
    await nextTick();
    isAnimating.value = true;
    setTimeout(() => {
      isAnimating.value = false;
    }, 250);
  }
};
</script>

<template>
  <div class="counter" :data-variant="variant">
    <span class="counterLabel">
      {{ variant === 'react' ? 'React' : 'Vue' }} Counter
    </span>

    <button class="button" @click="handleCountChange(count - 1)" :aria-label="`减少计数`">
      −
    </button>

    <span ref="countElement" :class="['count', { animate: isAnimating }]" :aria-label="`当前计数: ${count}`">
      {{ count }}
    </span>

    <button class="button" @click="handleCountChange(count + 1)" :aria-label="`增加计数`">
      +
    </button>
  </div>
</template>

<style scoped>
/* 使用与 React 版本一致的现代化大尺寸样式 */
.counter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xl); /* 增大间距 */
  padding: var(--spacing-xl) var(--spacing-2xl); /* 增大内边距 */
  background: var(--color-bg-primary);
  border-radius: var(--radius-xl); /* 增大圆角 */
  font-family: inherit;
  /* 精确控制过渡效果 */
  transition-property: background-color, border-color, box-shadow;
  transition-duration: var(--transition-fast);
  transition-timing-function: ease;
  min-width: 280px; /* 增大最小宽度 */
  position: relative;
  /* 默认使用主色调 */
  --counter-primary: var(--color-primary);
  --counter-hover: var(--color-primary-hover);
}

/* React 变体 - 使用语义辅助色 */
.counter[data-variant="react"] {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(6, 182, 212, 0.03) 100%);
  --counter-primary: var(--color-variant-secondary);
  --counter-hover: #0891b2;
}

/* Vue 变体 - 使用语义第三色（绿色调） */
.counter[data-variant="vue"] {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.03) 100%);
  --counter-primary: var(--color-variant-tertiary);
  --counter-hover: #059669;
}

.button {
  width: 48px; /* 增大按钮尺寸 */
  height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--counter-primary);
  color: white;
  font-weight: 600;
  font-size: 1.4rem; /* 增大字体 */
  cursor: pointer;
  /* 为按钮启用必要的过渡效果，包括transform */
  transition-property: background-color, color, box-shadow, transform;
  transition-duration: var(--transition-fast);
  transition-timing-function: ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  user-select: none;
}

.button:hover {
  background: var(--counter-hover);
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.button:active {
  transform: translateY(0) scale(0.95);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.count {
  font-size: 2.25rem; /* 显著增大数字显示 */
  font-weight: 700;
  color: var(--counter-primary);
  min-width: 3rem; /* 增大最小宽度 */
  text-align: center;
  /* 只为颜色添加过渡 */
  transition-property: color;
  transition-duration: var(--transition-fast);
  transition-timing-function: ease;
  user-select: none;
}

.counterLabel {
  position: absolute;
  top: -8px; /* 稍微调整位置适应更大的组件 */
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-bg-primary);
  padding: 0 var(--spacing-md); /* 增大内边距 */
  font-size: 0.8rem; /* 稍微增大字体 */
  font-weight: 600;
  color: var(--counter-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-radius: var(--radius-sm);
}

/* 悬停时整体轻微高亮 */
.counter:hover {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 数值变化动画 */
@keyframes countChange {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.1);
    color: var(--counter-hover);
  }

  100% {
    transform: scale(1);
  }
}

.count.animate {
  animation: countChange 0.25s ease-out;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .counter {
    min-width: 220px; /* 调整移动端最小宽度 */
    padding: var(--spacing-lg); /* 保持适当的内边距 */
    gap: var(--spacing-lg); /* 保持适当的间距 */
  }

  .button {
    width: 42px; /* 稍微减小但仍然足够大 */
    height: 42px;
    font-size: 1.3rem; /* 保持较大的字体 */
  }

  .count {
    font-size: 2rem; /* 在移动端保持较大的数字显示 */
    min-width: 2.5rem;
  }

  .counterLabel {
    font-size: 0.75rem; /* 移动端稍微调整标签字体 */
    top: -7px;
  }
}
</style>
