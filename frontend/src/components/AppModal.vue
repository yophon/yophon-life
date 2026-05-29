<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="modal-overlay open"
      role="dialog"
      aria-modal="true"
      @click.self="$emit('close')"
      @keydown.escape="$emit('close')"
    >
      <div class="modal card card-pad-lg" ref="modalRef" tabindex="-1" style="outline: none;">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{ visible: boolean }>()
defineEmits<{ close: [] }>()

const modalRef = ref<HTMLElement | null>(null)

watch(() => props.visible, async (val) => {
  if (val) {
    await nextTick()
    modalRef.value?.focus()
  }
})
</script>
