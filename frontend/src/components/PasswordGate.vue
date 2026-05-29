<template>
  <div v-if="!authStore.checked" class="gate-overlay">
    <div class="card gate-card card-pad-lg" style="text-align: center;">
      <p class="text-body">{{ prefs.t('gateLoading') }}</p>
    </div>
  </div>
  <div v-else-if="!authStore.authed" class="gate-overlay">
    <div class="card gate-card card-pad-lg">
      <div class="gate-icon">🔒</div>
      <h2 class="heading-lg">{{ prefs.t('gateTitle') }}</h2>
      <p class="text-body" style="margin: 12px 0 24px;">{{ prefs.t('gateDesc') }}</p>
      <input type="password" class="input input-lg" v-model="password"
        :placeholder="prefs.t('gatePlaceholder')" style="margin-bottom: 12px; text-align: center;"
        @keyup.enter="handleLogin">
      <button class="btn btn-filled" style="width: 100%;" @click="handleLogin">{{ prefs.t('gateUnlock') }}</button>
      <p v-if="error" class="text-sm" style="color: var(--color-danger); margin-top: 12px;">{{ error }}</p>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { usePreferencesStore } from '../stores/preferences'

const authStore = useAuthStore()
const prefs = usePreferencesStore()
const password = ref('')
const error = ref('')

onMounted(() => {
  if (!authStore.checked) {
    authStore.check()
  }
})

async function handleLogin() {
  error.value = ''
  const ok = await authStore.login(password.value)
  if (!ok) {
    error.value = prefs.t('gateError')
    password.value = ''
  }
}
</script>
