<template>
  <nav class="nav">
    <div class="nav-inner">
      <RouterLink to="/" class="nav-logo">yophon life</RouterLink>
      <div class="nav-links life-nav-links">
        <RouterLink to="/" active-class="active">{{ prefs.t('navDiary') }}</RouterLink>
        <RouterLink to="/todo" active-class="active">{{ prefs.t('navTodo') }}</RouterLink>
        <RouterLink to="/finance" active-class="active">{{ prefs.t('navFinance') }}</RouterLink>
        <RouterLink to="/settings" active-class="active">{{ prefs.t('navSettings') }}</RouterLink>
        <button v-if="authStore.authed" class="life-nav-logout" @click="authStore.logout">{{ prefs.t('navLogout') }}</button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { usePreferencesStore } from '../stores/preferences'

const authStore = useAuthStore()
const prefs = usePreferencesStore()
</script>
