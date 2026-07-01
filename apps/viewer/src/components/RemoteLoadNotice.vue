<script setup lang="ts">
import type { PetAnimIndexEntry } from "../lib/pet-anim-index";

defineProps<{
  loading?: boolean;
  loadingMessage?: string | null;
  error?: string | null;
  entry?: PetAnimIndexEntry | null;
  canRetry?: boolean;
}>();

const emit = defineEmits<{
  retry: [];
  dismiss: [];
}>();
</script>

<template>
  <div
    v-if="loading && loadingMessage"
    class="remote-notice remote-notice-loading"
    role="status"
    aria-live="polite"
  >
    <span class="remote-notice-spinner" aria-hidden="true" />
    <span>{{ loadingMessage }}</span>
  </div>

  <div
    v-else-if="error"
    class="remote-notice remote-notice-error"
    role="alert"
  >
    <p class="remote-notice-title">加载失败</p>
    <p v-if="entry" class="remote-notice-target">
      精灵 #{{ entry.id }} · {{ entry.name }}
      <span class="remote-notice-kind">{{ entry.kind === "swf" ? "SWF" : "Spine" }}</span>
    </p>
    <p class="remote-notice-message">{{ error }}</p>
    <p v-if="canRetry" class="remote-notice-hint">
      可点击重试，或通过顶部菜单导入本地 bundle、<code>.swfclip</code> / <code>.spineclip</code> 目录。
    </p>
    <p v-else class="remote-notice-hint">
      请检查文件后重新导入，或通过顶部菜单选择其他资源。
    </p>
    <div class="remote-notice-actions">
      <button
        v-if="canRetry"
        type="button"
        class="primary"
        @click="emit('retry')"
      >
        重试
      </button>
      <button type="button" @click="emit('dismiss')">关闭</button>
    </div>
  </div>
</template>

<style scoped>
.remote-notice {
  width: 100%;
  max-width: 560px;
  margin-bottom: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 0.88rem;
}

.remote-notice-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text);
}

.remote-notice-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: remote-spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes remote-spin {
  to {
    transform: rotate(360deg);
  }
}

.remote-notice-error {
  border: 1px solid color-mix(in srgb, var(--error) 35%, var(--border));
  background: color-mix(in srgb, var(--error) 8%, var(--panel));
}

.remote-notice-title {
  margin: 0 0 6px;
  font-weight: 600;
  color: var(--error);
}

.remote-notice-target {
  margin: 0 0 4px;
  color: var(--text);
  font-size: 0.85rem;
}

.remote-notice-kind {
  margin-left: 6px;
  font-size: 0.78rem;
  color: var(--muted);
}

.remote-notice-message {
  margin: 0 0 8px;
  color: var(--text);
  line-height: 1.45;
}

.remote-notice-hint {
  margin: 0 0 10px;
  color: var(--muted);
  font-size: 0.82rem;
  line-height: 1.45;
}

.remote-notice-hint code {
  font-size: 0.9em;
}

.remote-notice-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.remote-notice-actions button {
  min-height: 36px;
}

@media (max-width: 768px) {
  .remote-notice {
    max-width: none;
  }
}
</style>
