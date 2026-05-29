<template>
  <LifeNav />
  <router-view />
</template>

<script setup lang="ts">
import LifeNav from './components/LifeNav.vue'
import { usePreferencesStore } from './stores/preferences'

usePreferencesStore()
</script>
