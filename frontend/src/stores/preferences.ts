import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { messages, type MessageKey } from '../i18n/messages'

export type Language = 'zh-CN' | 'en-US'
export type Theme = 'system' | 'light' | 'dark'
export type Accent = 'forest' | 'blue' | 'rose'
export type Density = 'comfortable' | 'compact'
export type Motion = 'full' | 'reduced'

type PreferenceSnapshot = {
  language: Language
  theme: Theme
  accent: Accent
  density: Density
  motion: Motion
}

const STORAGE_KEY = 'yophon-life-preferences'

const defaults: PreferenceSnapshot = {
  language: 'zh-CN',
  theme: 'system',
  accent: 'forest',
  density: 'comfortable',
  motion: 'full',
}

function isLanguage(value: unknown): value is Language {
  return value === 'zh-CN' || value === 'en-US'
}

function isTheme(value: unknown): value is Theme {
  return value === 'system' || value === 'light' || value === 'dark'
}

function isAccent(value: unknown): value is Accent {
  return value === 'forest' || value === 'blue' || value === 'rose'
}

function isDensity(value: unknown): value is Density {
  return value === 'comfortable' || value === 'compact'
}

function isMotion(value: unknown): value is Motion {
  return value === 'full' || value === 'reduced'
}

function loadPreferences(): PreferenceSnapshot {
  if (typeof window === 'undefined') return defaults

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') as Partial<PreferenceSnapshot>
    return {
      language: isLanguage(parsed.language) ? parsed.language : defaults.language,
      theme: isTheme(parsed.theme) ? parsed.theme : defaults.theme,
      accent: isAccent(parsed.accent) ? parsed.accent : defaults.accent,
      density: isDensity(parsed.density) ? parsed.density : defaults.density,
      motion: isMotion(parsed.motion) ? parsed.motion : defaults.motion,
    }
  } catch {
    return defaults
  }
}

export const usePreferencesStore = defineStore('preferences', () => {
  const initial = loadPreferences()
  const language = ref<Language>(initial.language)
  const theme = ref<Theme>(initial.theme)
  const accent = ref<Accent>(initial.accent)
  const density = ref<Density>(initial.density)
  const motion = ref<Motion>(initial.motion)

  const snapshot = computed<PreferenceSnapshot>(() => ({
    language: language.value,
    theme: theme.value,
    accent: accent.value,
    density: density.value,
    motion: motion.value,
  }))

  const resolvedTheme = computed<'light' | 'dark'>(() => {
    if (theme.value !== 'system') return theme.value
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  function t(key: MessageKey) {
    return messages[language.value][key]
  }

  function tr(key: MessageKey, values: Record<string, string | number>) {
    return t(key).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''))
  }

  function applyDomPreferences() {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    root.lang = language.value
    root.dataset.theme = resolvedTheme.value
    root.dataset.themeChoice = theme.value
    root.dataset.accent = accent.value
    root.dataset.density = density.value
    root.dataset.motion = motion.value
    document.title = t('appName')
  }

  function persist() {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot.value))
  }

  function setLanguage(value: Language) {
    language.value = value
  }

  function setTheme(value: Theme) {
    theme.value = value
  }

  function setAccent(value: Accent) {
    accent.value = value
  }

  function setDensity(value: Density) {
    density.value = value
  }

  function setMotion(value: Motion) {
    motion.value = value
  }

  function reset() {
    language.value = defaults.language
    theme.value = defaults.theme
    accent.value = defaults.accent
    density.value = defaults.density
    motion.value = defaults.motion
  }

  watch(snapshot, () => {
    persist()
    applyDomPreferences()
  }, { deep: true, immediate: true })

  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyDomPreferences)
  }

  return {
    language,
    theme,
    accent,
    density,
    motion,
    resolvedTheme,
    t,
    tr,
    setLanguage,
    setTheme,
    setAccent,
    setDensity,
    setMotion,
    reset,
  }
})
