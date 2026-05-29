<template>
  <main>
    <section class="section">
      <div class="container-sm">
        <div class="card card-pad-lg fade-up" style="text-align: center;">
          <div style="font-size: 4rem; margin-bottom: 16px;">404</div>
          <h1 class="heading-xl mb-16">{{ prefs.t('notFoundTitle') }}</h1>
          <p class="text-body mb-24">{{ prefs.t('notFoundDesc') }}</p>
          <router-link to="/" class="btn btn-filled">{{ prefs.t('notFoundBack') }}</router-link>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { usePreferencesStore } from '../stores/preferences'

const prefs = usePreferencesStore()
</script>
