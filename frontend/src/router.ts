import { createRouter, createWebHistory } from 'vue-router'
import DiaryPage from './views/DiaryPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: DiaryPage, meta: { requiresAuth: true } },
    { path: '/diary', component: DiaryPage, meta: { requiresAuth: true } },
    { path: '/todo', component: () => import('./views/TodoPage.vue'), meta: { requiresAuth: true } },
    { path: '/finance', component: () => import('./views/FinancePage.vue'), meta: { requiresAuth: true } },
    { path: '/settings', component: () => import('./views/SettingsPage.vue'), meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', component: () => import('./views/NotFoundPage.vue') },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
