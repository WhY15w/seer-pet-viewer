<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useViewerSettings } from "../composables/useViewerSettings";

defineProps<{
  petLoaded: boolean;
  sharedMaterialBundleName: string;
}>();

const emit = defineEmits<{
  cycleTheme: [];
  toggleToolbarPosition: [];
  fileInput: [e: Event];
  spineClipInput: [e: Event];
  materialInput: [e: Event];
  reset: [];
}>();

const {
  themeLabel,
  nextThemeLabel,
  toolbarLabel,
  nextToolbarLabel,
  isMobile,
} = useViewerSettings();

const showInfoMenu = ref(false);
const showMobileMenu = ref(false);
const infoMenuRef = ref<HTMLElement | null>(null);
const mobileMenuRef = ref<HTMLElement | null>(null);

function toggleInfoMenu(e: MouseEvent) {
  e.stopPropagation();
  showInfoMenu.value = !showInfoMenu.value;
  showMobileMenu.value = false;
}

function toggleMobileMenu(e: MouseEvent) {
  e.stopPropagation();
  showMobileMenu.value = !showMobileMenu.value;
  showInfoMenu.value = false;
}

function onDocClick(e: MouseEvent) {
  const target = e.target as Node;
  if (showInfoMenu.value && infoMenuRef.value && !infoMenuRef.value.contains(target)) {
    showInfoMenu.value = false;
  }
  if (showMobileMenu.value && mobileMenuRef.value && !mobileMenuRef.value.contains(target)) {
    showMobileMenu.value = false;
  }
}

onMounted(() => document.addEventListener("click", onDocClick));
onUnmounted(() => document.removeEventListener("click", onDocClick));

function closeMobileMenu() {
  showMobileMenu.value = false;
}
</script>

<template>
  <header class="header">
    <div class="header-brand">
      <div class="header-title-row">
        <h1>坚果的赛尔号精灵动画查看器</h1>
        <div ref="infoMenuRef" class="info-menu">
          <button
            type="button"
            class="info-btn"
            aria-label="关于与联系方式"
            :aria-expanded="showInfoMenu"
            @click="toggleInfoMenu"
          >
            i
          </button>
          <div
            v-if="showInfoMenu"
            class="info-popover"
            role="dialog"
            aria-label="关于与联系方式"
          >
            <a
              href="https://github.com/Nattsu39/seer-pet-viewer"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub项目链接
            </a>
            <a
              href="https://space.bilibili.com/31797289"
              target="_blank"
              rel="noopener noreferrer"
            >
              作者的B站主页
            </a>
            <a href="mailto:nattsu39@outlook.com">联系方式（邮箱）</a>
          </div>
        </div>
      </div>
    </div>

    <div class="header-actions">
      <button
        type="button"
        class="btn-setting"
        :title="`切换主题（当前：${themeLabel}，下次：${nextThemeLabel}）`"
        @click="emit('cycleTheme')"
      >
        {{ themeLabel }}
      </button>

      <button
        v-if="!isMobile"
        type="button"
        class="btn-setting"
        :title="`切换工具栏位置（当前：${toolbarLabel}，下次：${nextToolbarLabel}）`"
        @click="emit('toggleToolbarPosition')"
      >
        工具栏：{{ toolbarLabel }}
      </button>

      <template v-if="!isMobile">
        <label class="btn primary">
          导入 Bundle
          <input type="file" hidden @change="emit('fileInput', $event)" />
        </label>
        <label class="btn">
          导入 .swfclip
          <input
            type="file"
            hidden
            multiple
            webkitdirectory
            @change="emit('fileInput', $event)"
          />
        </label>
        <label class="btn">
          导入 .spineclip
          <input
            type="file"
            hidden
            multiple
            webkitdirectory
            @change="emit('spineClipInput', $event)"
          />
        </label>
        <label
          class="btn"
          :title="`导入 FlashTools 共享 SWF 材质：${sharedMaterialBundleName}`"
        >
          导入共享材质
          <input
            type="file"
            hidden
            accept=".bundle"
            @change="emit('materialInput', $event)"
          />
        </label>
        <button v-if="petLoaded" @click="emit('reset')">关闭</button>
      </template>

      <template v-else>
        <button
          v-if="petLoaded"
          type="button"
          class="btn-setting"
          @click="emit('reset')"
        >
          关闭
        </button>
        <div ref="mobileMenuRef" class="mobile-menu">
          <button
            type="button"
            class="btn-setting mobile-menu-btn"
            aria-label="打开菜单"
            :aria-expanded="showMobileMenu"
            @click="toggleMobileMenu"
          >
            菜单
          </button>
          <div v-if="showMobileMenu" class="mobile-menu-panel" role="menu">
            <label class="mobile-menu-item primary">
              导入 Bundle
              <input
                type="file"
                hidden
                @change="
                  emit('fileInput', $event);
                  closeMobileMenu();
                "
              />
            </label>
            <label class="mobile-menu-item">
              导入 .swfclip
              <input
                type="file"
                hidden
                multiple
                webkitdirectory
                @change="
                  emit('fileInput', $event);
                  closeMobileMenu();
                "
              />
            </label>
            <label class="mobile-menu-item">
              导入 .spineclip
              <input
                type="file"
                hidden
                multiple
                webkitdirectory
                @change="
                  emit('spineClipInput', $event);
                  closeMobileMenu();
                "
              />
            </label>
            <label
              class="mobile-menu-item"
              :title="`导入 FlashTools 共享 SWF 材质：${sharedMaterialBundleName}`"
            >
              导入共享材质
              <input
                type="file"
                hidden
                accept=".bundle"
                @change="
                  emit('materialInput', $event);
                  closeMobileMenu();
                "
              />
            </label>
          </div>
        </div>
      </template>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  padding-top: max(12px, env(safe-area-inset-top));
  padding-left: max(20px, env(safe-area-inset-left));
  padding-right: max(20px, env(safe-area-inset-right));
  border-bottom: 1px solid var(--border);
  background: var(--panel);
  flex-shrink: 0;
  gap: 12px;
  flex-wrap: wrap;
}

.header-brand {
  display: flex;
  align-items: center;
  min-width: 0;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.header h1 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
}

.info-menu {
  position: relative;
  flex-shrink: 0;
}

.info-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 600;
  font-style: italic;
  line-height: 1;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
}

.info-btn:hover,
.info-btn[aria-expanded="true"] {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-soft);
}

.info-popover {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 180px;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--panel);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

.info-popover a {
  padding: 6px 10px;
  border-radius: 4px;
  color: var(--text);
  text-decoration: none;
  font-size: 0.85rem;
  white-space: nowrap;
}

.info-popover a:hover {
  color: var(--accent);
  background: var(--accent-soft);
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.btn-setting {
  font-size: 0.85rem;
  white-space: nowrap;
  min-height: 36px;
}

.btn {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--panel);
  cursor: pointer;
  font-size: 0.9rem;
}

.btn.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.mobile-menu {
  position: relative;
}

.mobile-menu-btn {
  min-height: 44px;
  min-width: 44px;
}

.mobile-menu-panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 200px;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--panel);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

.mobile-menu-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text);
  font-size: 0.9rem;
  cursor: pointer;
  min-height: 44px;
}

.mobile-menu-item.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

@media (max-width: 768px) {
  .header {
    padding: 10px 12px;
    padding-top: max(10px, env(safe-area-inset-top));
    padding-left: max(12px, env(safe-area-inset-left));
    padding-right: max(12px, env(safe-area-inset-right));
  }

  .header h1 {
    font-size: 0.95rem;
    line-height: 1.3;
  }

  .header-actions {
    flex-wrap: nowrap;
  }
}
</style>
