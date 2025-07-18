<template>
  <div v-if="isDev" class="editButtonContainer" :class="className">
    <button class="editButton" @click="handleEditClick"
      :title="`Edit this page in IDE\nSource: ${props.currentFileUrl}`" aria-label="Edit this page in IDE">
      <span class="editIcon">🖊️</span>
      <span class="editText">Try editing this page</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface EditButtonProps {
  className?: string;
  currentFileUrl: string;
}

const props = withDefaults(defineProps<EditButtonProps>(), {
  className: ''
});

// Check if we're in development environment using import.meta.env.DEV
const isDev = computed(() => import.meta.env.DEV);

const getCurrentFilePath = (): string => {
  // Use the full path from the provided currentFileUrl
  try {
    const url = new URL(props.currentFileUrl);
    return url.pathname;
  } catch (error) {
    console.error('Failed to parse currentFileUrl:', error);
    throw new Error('Invalid currentFileUrl provided');
  }
};

const handleEditClick = async () => {
  // Get current file path from currentFileUrl
  const currentFilePath = getCurrentFilePath();

  if (!currentFilePath) {
    console.error('No file path available for editing');
    return;
  }

  // Use dev server's built-in functionality to open file
  const openUrl = `/__open-in-editor?file=${encodeURIComponent(currentFilePath)}`;

  console.log('Opening file in editor:', openUrl);

  try {
    const response = await fetch(openUrl);
    if (!response.ok) {
      console.warn('Failed to open file in editor:', response.statusText);
    }
  } catch (error) {
    console.error('Error opening file in editor:', error);
  }
};
</script>

<style scoped>
/* Edit Button Styles */
.editButtonContainer {
  margin-top: var(--spacing-xl);
  text-align: center;
  animation: fadeIn 0.3s ease-out;
}

.editButton {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: all var(--transition-normal) ease;
}

.editButton:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  border-color: var(--color-border-secondary);
  transform: translateY(-1px);
}

.editButton:active {
  transform: translateY(0);
}

.editButton:focus {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px var(--color-border-focus);
}

.editIcon {
  font-size: var(--font-size-base);
  line-height: 1;
}

.editText {
  font-size: var(--font-size-sm);
  font-weight: 500;
  white-space: nowrap;
}

/* Animation */
@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .editButton {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-xs);
  }

  .editText {
    display: none;
  }

  .editIcon {
    font-size: var(--font-size-base);
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .editButton {
    background: var(--color-bg-secondary);
    color: var(--color-text-secondary);
    border-color: var(--color-border-primary);
  }

  .editButton:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
    border-color: var(--color-border-secondary);
  }
}
</style>