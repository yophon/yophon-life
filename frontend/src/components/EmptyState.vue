<template>
  <div class="empty-state">
    <div class="empty-state-icon">{{ icon }}</div>
    <p>{{ displayText }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePreferencesStore } from '../stores/preferences'

const props = withDefaults(defineProps<{ icon?: string; text?: string }>(), {
  icon: '📭',
})

const prefs = usePreferencesStore()
const displayText = computed(() => props.text || prefs.t('emptyDefault'))
</script>
