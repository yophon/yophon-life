<template>
  <nav class="nav">
    <div class="nav-inner">
      <RouterLink to="/" class="nav-logo" @click="closeMenu">yophon life</RouterLink>
      <button
        class="nav-mobile-toggle"
        type="button"
        :aria-label="menuOpen ? prefs.t('commonClose') : prefs.t('commonMenu')"
        :aria-expanded="menuOpen"
        @click="menuOpen = !menuOpen">
        {{ menuOpen ? '×' : '☰' }}
      </button>
      <div class="nav-links life-nav-links" :class="{ open: menuOpen }">
        <RouterLink to="/" active-class="active" @click="closeMenu">{{ prefs.t('navDiary') }}</RouterLink>
        <RouterLink to="/todo" active-class="active" @click="closeMenu">{{ prefs.t('navTodo') }}</RouterLink>
        <RouterLink to="/finance" active-class="active" @click="closeMenu">{{ prefs.t('navFinance') }}</RouterLink>
        <RouterLink to="/settings" active-class="active" @click="closeMenu">{{ prefs.t('navSettings') }}</RouterLink>
        <button v-if="authStore.authed" class="life-nav-logout" @click="authStore.logout">{{ prefs.t('navLogout') }}</button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { usePreferencesStore } from '../stores/preferences'

const authStore = useAuthStore()
const prefs = usePreferencesStore()
const route = useRoute()
const menuOpen = ref(false)

function closeMenu() {
  menuOpen.value = false
}

watch(() => route.fullPath, closeMenu)
</script>
