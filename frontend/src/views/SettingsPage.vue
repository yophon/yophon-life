<template>
  <PasswordGate>
    <main>
      <section class="section">
        <div class="container">
          <div class="card card-pad-lg fade-up">
            <div>
              <p class="text-sm mb-8">{{ prefs.t('settingsEyebrow') }}</p>
              <h1 class="heading-xl">{{ prefs.t('settingsTitle') }}</h1>
            </div>
          </div>
        </div>
      </section>

      <section class="section" style="padding-top: 0;">
        <div class="container">
          <div class="settings-grid fade-up">
            <div class="card card-pad-lg settings-panel">
              <div class="settings-panel-header">
                <div>
                  <p class="text-sm mb-8">{{ prefs.t('settingsThemePreview') }}</p>
                  <h2 class="heading-md">{{ prefs.t('settingsAppearance') }}</h2>
                </div>
                <div class="settings-preview" aria-hidden="true">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>

              <SettingGroup :label="prefs.t('settingsLanguage')">
                <div class="segmented-control">
                  <button
                    type="button"
                    :class="{ active: prefs.language === 'zh-CN' }"
                    @click="prefs.setLanguage('zh-CN')">
                    {{ prefs.t('languageChinese') }}
                  </button>
                  <button
                    type="button"
                    :class="{ active: prefs.language === 'en-US' }"
                    @click="prefs.setLanguage('en-US')">
                    English
                  </button>
                </div>
              </SettingGroup>

              <SettingGroup :label="prefs.t('settingsTheme')">
                <div class="segmented-control">
                  <button
                    v-for="option in themeOptions"
                    :key="option.value"
                    type="button"
                    :class="{ active: prefs.theme === option.value }"
                    @click="prefs.setTheme(option.value)">
                    {{ option.label }}
                  </button>
                </div>
              </SettingGroup>

              <SettingGroup :label="prefs.t('settingsAccent')">
                <div class="swatch-row">
                  <button
                    v-for="option in accentOptions"
                    :key="option.value"
                    type="button"
                    class="swatch-button"
                    :class="[option.value, { active: prefs.accent === option.value }]"
                    :title="option.label"
                    @click="prefs.setAccent(option.value)">
                    <span></span>
                    {{ option.label }}
                  </button>
                </div>
              </SettingGroup>

              <SettingGroup :label="prefs.t('settingsDensity')">
                <div class="segmented-control">
                  <button
                    v-for="option in densityOptions"
                    :key="option.value"
                    type="button"
                    :class="{ active: prefs.density === option.value }"
                    @click="prefs.setDensity(option.value)">
                    {{ option.label }}
                  </button>
                </div>
              </SettingGroup>

              <SettingGroup :label="prefs.t('settingsMotion')">
                <div class="segmented-control">
                  <button
                    v-for="option in motionOptions"
                    :key="option.value"
                    type="button"
                    :class="{ active: prefs.motion === option.value }"
                    @click="prefs.setMotion(option.value)">
                    {{ option.label }}
                  </button>
                </div>
              </SettingGroup>
            </div>

            <div class="card card-pad-lg settings-panel">
              <p class="text-sm mb-8">{{ prefs.t('settingsCurrentLanguage') }}</p>
              <h2 class="heading-md mb-16">{{ prefs.language === 'zh-CN' ? prefs.t('languageChinese') : prefs.t('languageEnglish') }}</h2>
              <div class="settings-summary">
                <div>
                  <span>{{ prefs.t('settingsTheme') }}</span>
                  <strong>{{ currentThemeLabel }}</strong>
                </div>
                <div>
                  <span>{{ prefs.t('settingsAccent') }}</span>
                  <strong>{{ currentAccentLabel }}</strong>
                </div>
                <div>
                  <span>{{ prefs.t('settingsDensity') }}</span>
                  <strong>{{ currentDensityLabel }}</strong>
                </div>
                <div>
                  <span>{{ prefs.t('settingsMotion') }}</span>
                  <strong>{{ currentMotionLabel }}</strong>
                </div>
              </div>

              <div class="settings-divider"></div>

              <h2 class="heading-md mb-12">{{ prefs.t('settingsPrivacy') }}</h2>
              <div class="settings-actions">
                <button class="btn" type="button" @click="prefs.reset">{{ prefs.t('settingsReset') }}</button>
                <button class="btn btn-danger" type="button" @click="authStore.logout">{{ prefs.t('settingsLogout') }}</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </PasswordGate>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, type VNode } from 'vue'
import PasswordGate from '../components/PasswordGate.vue'
import { useAuthStore } from '../stores/auth'
import { usePreferencesStore, type Accent, type Density, type Motion, type Theme } from '../stores/preferences'

const SettingGroup = defineComponent({
  props: {
    label: {
      type: String,
      required: true,
    },
  },
  setup(props, { slots }) {
    return () => h('div', { class: 'setting-group' }, [
      h('div', { class: 'form-label' }, props.label),
      h('div', { class: 'setting-control' }, slots.default?.() as VNode[] | undefined),
    ])
  },
})

const prefs = usePreferencesStore()
const authStore = useAuthStore()

const themeOptions = computed<{ value: Theme; label: string }[]>(() => [
  { value: 'system', label: prefs.t('optionSystem') },
  { value: 'light', label: prefs.t('optionLight') },
  { value: 'dark', label: prefs.t('optionDark') },
])

const accentOptions = computed<{ value: Accent; label: string }[]>(() => [
  { value: 'forest', label: prefs.t('optionForest') },
  { value: 'blue', label: prefs.t('optionBlue') },
  { value: 'rose', label: prefs.t('optionRose') },
])

const densityOptions = computed<{ value: Density; label: string }[]>(() => [
  { value: 'comfortable', label: prefs.t('optionComfortable') },
  { value: 'compact', label: prefs.t('optionCompact') },
])

const motionOptions = computed<{ value: Motion; label: string }[]>(() => [
  { value: 'full', label: prefs.t('optionFullMotion') },
  { value: 'reduced', label: prefs.t('optionReducedMotion') },
])

function labelFor<T extends string>(options: { value: T; label: string }[], value: T) {
  return options.find((option) => option.value === value)?.label || value
}

const currentThemeLabel = computed(() => labelFor(themeOptions.value, prefs.theme))
const currentAccentLabel = computed(() => labelFor(accentOptions.value, prefs.accent))
const currentDensityLabel = computed(() => labelFor(densityOptions.value, prefs.density))
const currentMotionLabel = computed(() => labelFor(motionOptions.value, prefs.motion))
</script>
