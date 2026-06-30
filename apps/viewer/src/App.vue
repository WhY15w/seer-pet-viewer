<script setup lang="ts">
import { defineAsyncComponent, ref } from "vue";
import { useSwfLoader } from "./composables/useSwfLoader";
import { useViewerSettings } from "./composables/useViewerSettings";

const PetViewer = defineAsyncComponent(
  () => import("./components/PetViewer.vue"),
);

const {
  loading,
  error,
  clip,
  parseMs,
  warnings,
  loadBundleFile,
  loadSwfClipDir,
  loadMaterialBundle,
  reset,
} = useSwfLoader();

const {
  toolbarPosition,
  themeLabel,
  nextThemeLabel,
  toolbarLabel,
  nextToolbarLabel,
  cycleTheme,
  toggleToolbarPosition,
} = useViewerSettings();

const dragOver = ref(false);
const fps = ref(0);
const frameInfo = ref("-");

function onDrop(e: DragEvent) {
  dragOver.value = false;
  e.preventDefault();
  const files = e.dataTransfer?.files;
  if (!files?.length) return;
  handleFiles(files);
}

async function handleFiles(files: FileList) {
  const arr = Array.from(files);
  const meta = arr.find((f) => f.name === "meta.json");
  if (meta && arr.some((f) => f.name === "atlas.png")) {
    await loadSwfClipDir(arr);
    return;
  }
  const bundle = arr.find((f) => !f.name.endsWith(".json"));
  if (bundle) await loadBundleFile(bundle);
}

function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.length) handleFiles(input.files);
  input.value = "";
}

function onMaterialInput(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) loadMaterialBundle(file);
  input.value = "";
}
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>赛尔号精灵动画查看器</h1>
      <div class="header-actions">
        <button
          type="button"
          class="btn-setting"
          :title="`切换主题（当前：${themeLabel}，下次：${nextThemeLabel}）`"
          @click="cycleTheme"
        >
          {{ themeLabel }}
        </button>
        <button
          type="button"
          class="btn-setting"
          :title="`切换工具栏位置（当前：${toolbarLabel}，下次：${nextToolbarLabel}）`"
          @click="toggleToolbarPosition"
        >
          工具栏：{{ toolbarLabel }}
        </button>
        <label class="btn primary">
          导入 Bundle
          <input type="file" hidden @change="onFileInput" />
        </label>
        <label class="btn">
          导入 .swfclip
          <input
            type="file"
            hidden
            multiple
            webkitdirectory
            @change="onFileInput"
          />
        </label>
        <label class="btn" :class="{ disabled: !clip }" title="可选：导入游戏材质包">
          导入材质
          <input
            type="file"
            hidden
            :disabled="!clip"
            @change="onMaterialInput"
          />
        </label>
        <button v-if="clip" @click="reset">关闭</button>
      </div>
    </header>

    <div
      v-if="!clip"
      class="dropzone"
      :class="{ dragover: dragOver }"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @drop="onDrop"
    >
      <p v-if="loading">正在解析…</p>
      <template v-else>
        <p class="drop-title">拖放 <code>ppets_*</code> bundle 到此处</p>
        <p class="drop-hint">或点击上方按钮选择文件；支持预转换 <code>.swfclip</code> 目录</p>
        <p v-if="error" class="error">{{ error }}</p>
      </template>
    </div>

    <template v-else>
      <div class="status-bar">
        <span>精灵 #{{ clip.petId }}</span>
        <span>{{ clip.atlasWidth }}×{{ clip.atlasHeight }}</span>
        <span>{{ clip.frameRate }} fps</span>
        <span>解析 {{ parseMs }} ms</span>
        <span>{{ frameInfo }}</span>
        <span>渲染 {{ fps }} fps</span>
      </div>

      <div v-if="warnings.length" class="warnings">
        <p v-for="(w, i) in warnings" :key="i">{{ w }}</p>
      </div>

      <Suspense>
        <PetViewer
          :clip="clip"
          :toolbar-position="toolbarPosition"
          @frame-change="(f, t) => (frameInfo = `帧 ${f + 1}/${t}`)"
          @fps-update="(v) => (fps = v)"
        />
        <template #fallback>
          <div class="loading-viewer">正在初始化渲染器…</div>
        </template>
      </Suspense>
    </template>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--panel);
  flex-shrink: 0;
  gap: 12px;
  flex-wrap: wrap;
}

.header h1 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
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

.btn.disabled {
  opacity: 0.4;
  pointer-events: none;
}

.dropzone {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 24px;
  border: 2px dashed var(--border);
  border-radius: 12px;
  color: var(--muted);
  transition: border-color 0.15s, background 0.15s;
}

.dropzone.dragover {
  border-color: var(--accent);
  background: var(--dropzone-active-bg);
}

.drop-title {
  font-size: 1.1rem;
  color: var(--text);
  margin: 0 0 8px;
}

.drop-hint {
  margin: 0;
  font-size: 0.9rem;
}

.error {
  color: var(--error);
  margin-top: 16px;
}

.loading-viewer {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
}

.status-bar {
  display: flex;
  gap: 20px;
  padding: 8px 20px;
  font-size: 0.85rem;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.warnings {
  padding: 8px 20px;
  background: var(--warning-bg);
  border-bottom: 1px solid var(--warning-border);
  font-size: 0.82rem;
  color: var(--warning-text);
}

.warnings p {
  margin: 2px 0;
}
</style>
