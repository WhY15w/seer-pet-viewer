<script setup lang="ts">
import type { PetAnimIndexEntry } from "../lib/pet-anim-index";

defineProps<{
  entry: PetAnimIndexEntry;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  select: [entry: PetAnimIndexEntry];
}>();

function kindLabel(kind: PetAnimIndexEntry["kind"]) {
  return kind === "swf" ? "SWF" : "Spine";
}

function variantLabel(entry: PetAnimIndexEntry) {
  return entry.variant === "small" ? "（小）" : "";
}
</script>

<template>
  <button
    v-memo="[entry.name, disabled]"
    type="button"
    class="pet-picker-item"
    :disabled="disabled"
    @click="emit('select', entry)"
  >
    <span class="pet-picker-id">#{{ entry.id }}</span>
    <span class="pet-picker-name">{{ entry.name }}{{ variantLabel(entry) }}</span>
    <span class="pet-picker-kind">{{ kindLabel(entry.kind) }}</span>
  </button>
</template>

<style scoped>
.pet-picker-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-bottom: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  text-align: left;
  cursor: pointer;
  font-size: 0.88rem;
  min-height: 44px;
}

.pet-picker-item:last-child {
  border-bottom: none;
}

.pet-picker-item:hover:not(:disabled) {
  background: var(--accent-soft);
}

.pet-picker-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pet-picker-id {
  font-variant-numeric: tabular-nums;
  color: var(--accent);
  font-weight: 600;
}

.pet-picker-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-picker-kind {
  font-size: 0.75rem;
  color: var(--muted);
}
</style>
