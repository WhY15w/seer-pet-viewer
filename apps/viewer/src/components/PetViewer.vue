<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed } from "vue";
import { SwfPlayer } from "@seer/swf-renderer";
import type { SwfClipData } from "@seer/swf-bundle";
import type { ToolbarPosition } from "../composables/useViewerSettings";
import {
  getCanvasBackgroundColor,
  useViewerSettings,
} from "../composables/useViewerSettings";

const props = withDefaults(
  defineProps<{
    clip: SwfClipData;
    toolbarPosition?: ToolbarPosition;
  }>(),
  { toolbarPosition: "bottom" },
);

const emit = defineEmits<{
  frameChange: [frame: number, total: number];
  fpsUpdate: [fps: number];
}>();

const { resolvedTheme } = useViewerSettings();

const canvasHost = ref<HTMLElement | null>(null);
const player = ref<SwfPlayer | null>(null);
const currentSequence = ref(props.clip.sequences[0]?.name ?? "standby");
const playing = ref(true);
const loop = ref(true);
const speed = ref(1);
const currentFrame = ref(0);
const frameCount = ref(0);

const sequenceOptions = computed(() =>
  props.clip.sequences.map((s) => ({
    value: s.name,
    label: s.name,
    frames: s.frames.length,
  })),
);

let fpsFrames = 0;
let fpsLast = performance.now();

function syncFrameCount(seqName = currentSequence.value) {
  const seq = props.clip.sequences.find((s) => s.name === seqName);
  frameCount.value = seq?.frames.length ?? 0;
}

function syncPlayerBackground() {
  player.value?.setBackgroundColor(getCanvasBackgroundColor());
}

async function initPlayer() {
  if (!canvasHost.value) return;
  player.value?.destroy();

  currentSequence.value = props.clip.sequences[0]?.name ?? "standby";
  syncFrameCount();
  currentFrame.value = 0;

  const p = new SwfPlayer();
  p.setOnFrameChange((frame, total) => {
    currentFrame.value = frame;
    frameCount.value = total;
    emit("frameChange", frame, total);
    fpsFrames++;
    const now = performance.now();
    if (now - fpsLast >= 1000) {
      emit("fpsUpdate", fpsFrames);
      fpsFrames = 0;
      fpsLast = now;
    }
  });
  await p.mount(canvasHost.value, props.clip, {
    backgroundColor: getCanvasBackgroundColor(),
  });
  p.enablePan();
  p.setSequence(currentSequence.value);
  p.setLoop(loop.value);
  p.setSpeed(speed.value);
  if (playing.value) p.play();
  player.value = p;
}

watch(
  [() => props.clip, canvasHost],
  ([clip, host]) => {
    if (!clip || !host) return;
    void initPlayer();
  },
  { flush: "post", immediate: true },
);

watch(resolvedTheme, () => {
  syncPlayerBackground();
});

watch(currentSequence, (name) => {
  syncFrameCount(name);
  player.value?.setSequence(name);
  if (playing.value) player.value?.play();
});

watch(playing, (v) => (v ? player.value?.play() : player.value?.pause()));
watch(loop, (v) => player.value?.setLoop(v));
watch(speed, (v) => player.value?.setSpeed(v));

function togglePlay() {
  playing.value = !playing.value;
}

function stepFrame(delta: number) {
  player.value?.gotoFrame(currentFrame.value + delta);
}

function onSeek(e: Event) {
  const v = Number((e.target as HTMLInputElement).value);
  player.value?.gotoFrame(v);
}

function fitView() {
  player.value?.fitToView();
}

onBeforeUnmount(() => player.value?.destroy());

defineExpose({ fitView });
</script>

<template>
  <div class="viewer" :class="toolbarPosition">
    <div ref="canvasHost" class="canvas-host" />

    <aside class="controls">
      <div class="controls-row controls-main">
        <div class="seq-tabs">
          <button
            v-for="seq in sequenceOptions"
            :key="seq.value"
            :class="{ active: currentSequence === seq.value }"
            @click="currentSequence = seq.value"
          >
            {{ seq.label }}
            <span class="count">{{ seq.frames }}</span>
          </button>
        </div>

        <div class="transport">
          <button @click="stepFrame(-1)">上一帧</button>
          <button class="primary" @click="togglePlay">
            {{ playing ? "暂停" : "播放" }}
          </button>
          <button @click="stepFrame(1)">下一帧</button>
          <label class="check">
            <input v-model="loop" type="checkbox" />
            循环
          </label>
        </div>
      </div>

      <div class="controls-row controls-secondary">
        <div class="scrub">
          <input
            type="range"
            :min="0"
            :max="Math.max(0, frameCount - 1)"
            :value="currentFrame"
            @input="onSeek"
          />
          <span>{{ currentFrame + 1 }} / {{ frameCount }}</span>
        </div>

        <div class="speed">
          <label>速度 {{ speed.toFixed(2) }}×</label>
          <input v-model.number="speed" type="range" min="0.25" max="2" step="0.25" />
        </div>

        <button class="fit-btn" @click="fitView">适应窗口</button>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.viewer {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 0;
}

.viewer.bottom {
  flex-direction: column;
}

.viewer.side {
  flex-direction: row;
}

.canvas-host {
  flex: 1;
  min-width: 0;
  min-height: 240px;
  position: relative;
  background: var(--canvas-bg);
}

.canvas-host :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.controls {
  background: var(--panel);
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
}

.viewer.bottom .controls {
  flex-shrink: 0;
  width: 100%;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  max-height: 40vh;
}

.viewer.side .controls {
  width: 280px;
  flex-shrink: 0;
  padding: 16px;
  border-left: 1px solid var(--border);
  border-top: none;
}

.controls-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.viewer.bottom .controls-main {
  flex-wrap: wrap;
  align-items: flex-start;
}

.viewer.bottom .controls-secondary {
  flex-wrap: wrap;
}

.viewer.side .controls-row {
  flex-direction: column;
  align-items: stretch;
}

.seq-tabs {
  display: flex;
  gap: 6px;
}

.viewer.bottom .seq-tabs {
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}

.viewer.side .seq-tabs {
  flex-direction: column;
}

.seq-tabs button {
  text-align: left;
  display: flex;
  justify-content: space-between;
  white-space: nowrap;
}

.viewer.bottom .seq-tabs button {
  flex: 0 1 auto;
}

.seq-tabs button.active {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.count {
  color: var(--muted);
  font-size: 0.85em;
  margin-left: 8px;
}

.transport {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.viewer.side .transport {
  width: 100%;
}

.check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
  color: var(--muted);
}

.scrub {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85em;
  color: var(--muted);
}

.viewer.bottom .scrub {
  flex: 1;
  min-width: 180px;
}

.viewer.side .scrub {
  width: 100%;
}

.scrub input {
  width: 100%;
}

.speed {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.9em;
  min-width: 140px;
}

.viewer.side .speed {
  width: 100%;
}

.fit-btn {
  flex-shrink: 0;
}

.viewer.side .fit-btn {
  width: 100%;
}
</style>
