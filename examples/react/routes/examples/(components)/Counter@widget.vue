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

  // Add count change animation
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

    <button class="button" @click="handleCountChange(count - 1)" :aria-label="`Decrease count`">
      <span>−</span>
    </button>

    <span ref="countElement" :class="['count', { animate: isAnimating }]" :aria-label="`Current count: ${count}`">
      {{ count }}
    </span>

    <button class="button" @click="handleCountChange(count + 1)" :aria-label="`Increase count`">
      <span>+</span>
    </button>
  </div>
</template>

<style scoped>
/* Line-style counter component */
.counter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xl);
  /* Increased from var(--spacing-lg) */
  padding: var(--spacing-xl) var(--spacing-2xl);
  /* Increased from var(--spacing-lg) var(--spacing-xl) */
  background: transparent;
  border: 3px solid var(--color-border-primary);
  border-radius: var(--radius-lg);
  font-family: inherit;
  transition-property: border-color, box-shadow;
  transition-duration: var(--transition-fast);
  transition-timing-function: ease;
  min-width: 300px;
  /* Increased from 240px */
  position: relative;
  --counter-primary: var(--color-primary);
  --counter-hover: var(--color-primary-hover);
}

/* React variant - use blue lines */
.counter[data-variant="react"] {
  border-color: var(--color-variant-secondary);
  --counter-primary: var(--color-variant-secondary);
  --counter-hover: #0891b2;
}

/* Vue variant - use green lines */
.counter[data-variant="vue"] {
  border-color: var(--color-variant-tertiary);
  --counter-primary: var(--color-variant-tertiary);
  --counter-hover: #059669;
}

.button {
  width: 48px;
  /* Increased from 40px */
  height: 48px;
  /* Increased from 40px */
  border-radius: 50%;
  border: 3px solid var(--counter-primary);
  background: transparent;
  color: var(--counter-primary);
  font-weight: 600;
  font-size: 1.4rem;
  /* Increased from 1.2rem */
  cursor: pointer;
  transition-property: background-color, color, border-color, transform;
  transition-duration: var(--transition-fast);
  transition-timing-function: ease;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  position: relative;
  overflow: hidden;
}

.button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--counter-primary);
  opacity: 0;
  transition: opacity var(--transition-fast) ease;
  border-radius: 50%;
}

.button:hover {
  color: white;
  transform: translateY(-1px);
}

.button:hover::before {
  opacity: 1;
}

.button:active {
  transform: translateY(0);
}

.button span {
  position: relative;
  z-index: 1;
}

.count {
  font-size: 2.2rem;
  /* Increased from 1.8rem */
  font-weight: 600;
  color: var(--counter-primary);
  min-width: 3rem;
  /* Increased from 2.5rem */
  text-align: center;
  transition-property: color, transform;
  transition-duration: var(--transition-fast);
  transition-timing-function: ease;
  user-select: none;
  position: relative;
}

.count::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 2px;
  background: var(--counter-primary);
  transition: width var(--transition-fast) ease;
}

.count.animate {
  transform: scale(1.1);
  color: var(--counter-hover);
}

.count.animate::after {
  width: 100%;
}

.counterLabel {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-bg-primary);
  padding: 0 var(--spacing-sm);
  font-size: 0.8rem;
  /* Increased from 0.75rem */
  font-weight: 600;
  color: var(--counter-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--counter-primary);
}

/* Slight highlight on hover */
.counter:hover {
  border-color: var(--counter-hover);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Responsive design */
@media (max-width: 480px) {
  .counter {
    min-width: 280px;
    /* Increased from 200px */
    padding: var(--spacing-lg) var(--spacing-xl);
    /* Increased from var(--spacing-md) var(--spacing-lg) */
    gap: var(--spacing-lg);
    /* Increased from var(--spacing-md) */
  }

  .button {
    width: 44px;
    /* Increased from 36px */
    height: 44px;
    /* Increased from 36px */
    font-size: 1.3rem;
    /* Increased from 1.1rem */
  }

  .count {
    font-size: 2rem;
    /* Increased from 1.6rem */
    min-width: 2.5rem;
    /* Increased from 2rem */
  }

  .counterLabel {
    font-size: 0.75rem;
    /* Increased from 0.7rem */
    top: -10px;
  }
}
</style>
