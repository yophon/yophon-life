<template>
  <PasswordGate>
    <main class="diary-page">
      <section class="section diary-workspace-section">
        <div class="diary-workspace">
          <aside class="diary-sidebar fade-up">
            <div class="card card-pad-lg diary-panel diary-header-card">
              <div class="diary-title-row">
                <div>
                  <p class="text-sm"></p>
                  <h1 class="heading-xl">{{ prefs.t('diaryTitle') }}</h1>
                </div>
                <button class="diary-add-btn" :title="prefs.t('diaryWrite')" @click="openModal()">+</button>
              </div>
            </div>

            <div class="card card-pad-lg diary-panel diary-side-card">
              <div class="diary-filter-panel">
                <div class="diary-search">
                  <span class="search-icon">🔍</span>
                  <input v-model="searchQuery" :placeholder="prefs.t('diarySearchPlaceholder')" @input="onSearch">
                </div>
                <div class="diary-filter-group">
                  <div class="mood-filter">
                    <button v-for="m in MOODS" :key="m.emoji"
                      :class="{ active: filterMood === m.emoji }"
                      @click="filterMood = filterMood === m.emoji ? '' : m.emoji">
                      {{ m.emoji }}
                    </button>
                  </div>
                </div>
                <div class="diary-filter-group" v-if="monthTags.length > 0">
                  <div class="tag-row">
                    <span v-for="t in monthTags" :key="t" class="tag"
                      :class="{ active: filterTag === t }"
                      @click="filterTag = filterTag === t ? '' : t">
                      {{ t }}
                    </span>
                  </div>
                </div>
                <button v-if="filterMood || filterTag" class="btn btn-sm" @click="filterMood = ''; filterTag = ''">{{ prefs.t('commonClear') }}</button>
              </div>
            </div>

            <div v-if="!searchMode" class="card card-pad-lg diary-panel diary-side-card">
              <div class="diary-calendar-head">
                <div class="finance-month-nav diary-month-nav">
                  <button @click="prevMonth">←</button>
                  <div class="month-picker" ref="monthPickerRef">
                    <button
                      class="month-picker-trigger"
                      type="button"
                      :aria-label="prefs.t('diaryPickMonth')"
                      :aria-expanded="showMonthPicker"
                      @click="toggleMonthPicker">
                      {{ formatMonthLabel(viewYear, viewMonth) }}
                    </button>
                    <div v-if="showMonthPicker" class="month-picker-popover">
                      <div class="month-picker-head">
                        <button type="button" :title="prefs.t('diaryPrevYear')" @click="pickerYear--">←</button>
                        <span>{{ formatYearLabel(pickerYear) }}</span>
                        <button type="button" :title="prefs.t('diaryNextYear')" @click="pickerYear++">→</button>
                      </div>
                      <div class="month-picker-grid">
                        <button
                          v-for="month in 12"
                          :key="month"
                          type="button"
                          :class="{ active: pickerYear === viewYear && month === viewMonth }"
                          @click="selectPickerMonth(month)">
                          {{ formatShortMonth(month) }}
                        </button>
                      </div>
                    </div>
                  </div>
                  <button @click="nextMonth">→</button>
                </div>
                <button v-if="!isCurrentMonth" class="btn btn-sm" @click="goToday">{{ prefs.t('commonBackThisMonth') }}</button>
              </div>
              <div class="diary-calendar">
                <div v-for="d in WEEKDAYS" :key="d" class="diary-calendar-header">{{ d }}</div>
                <div v-for="(cell, i) in calendarCells" :key="i"
                  class="diary-calendar-cell"
                  :class="{
                    today: cell.isToday,
                    active: cell.date === selectedDate,
                    'other-month': !cell.isCurrentMonth,
                  }"
                  @click="onCalendarClick(cell)">
                  <span v-if="cell.mood" class="cell-emoji">{{ cell.mood }}</span>
                  <span class="cell-day">{{ cell.day }}</span>
                </div>
              </div>
            </div>

            <div v-if="!searchMode" class="card card-pad-lg diary-panel diary-side-card">
              <div v-if="moodStats.length > 0" class="diary-stats-panel">
                <div class="diary-stat-hero">
                  <div class="pie-chart" :style="{ background: moodPieGradient }"></div>
                  <div>
                    <p class="text-xs">{{ prefs.t('diaryMonthCount') }}</p>
                    <p class="stat-number">{{ entries.length }}</p>
                  </div>
                  <div v-if="topMood">
                    <p class="text-xs">{{ prefs.t('diaryTopMood') }}</p>
                    <p class="diary-top-mood">{{ topMood.mood }}</p>
                  </div>
                </div>
                <div class="diary-mood-list">
                  <div v-for="(s, i) in moodStats" :key="s.mood" class="diary-mood-stat">
                    <span class="pie-legend-dot" :style="{ background: PIE_COLORS[i % PIE_COLORS.length] }"></span>
                    <span>{{ s.mood }} {{ s.mood_label }}</span>
                    <span>{{ s.count }}{{ prefs.t('commonArticleUnit') }}</span>
                  </div>
                </div>
              </div>
              <div v-else class="empty-state" style="padding:30px 0;">
                <p class="text-sm">{{ prefs.t('diaryEmptyMonth') }}</p>
              </div>
              <div v-if="topTags.length > 0" class="diary-stat-row">
                <div>
                  <p class="text-xs mb-8">{{ prefs.t('diaryTopTags') }}</p>
                  <div class="tag-row">
                    <span v-for="t in topTags" :key="t" class="tag" style="font-size:.7rem;">{{ t }}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section class="diary-content fade-up">
            <div v-if="searchMode" class="diary-search-hint">
              <span class="text-sm">{{ prefs.tr('commonSearchResult', { query: searchQuery, count: filteredEntries.length }) }}</span>
              <button class="btn btn-sm" @click="clearSearch">{{ prefs.t('commonClear') }}</button>
            </div>

            <div class="diary-list">
            <div v-for="entry in filteredEntries" :key="entry.id ?? `linked-${entry.date}`" class="card card-pad fade-up"
              :ref="(el) => setEntryCardRef(entry.date, el)"
              :class="{
                'diary-linked-only-card': !isDiaryEntry(entry),
                'diary-selected-card': entry.date === selectedDate,
              }"
              style="cursor:pointer;" @click="openDailyCard(entry)">
              <div class="flex justify-between items-center mb-8">
                <div class="flex items-center gap-8">
                  <span v-if="isDiaryEntry(entry) && entry.pinned" style="font-size:.85rem;">📌</span>
                  <h3 class="heading-sm">{{ entry.date }}</h3>
                  <span v-if="isDiaryEntry(entry)" class="text-sm">{{ entry.mood }} {{ entry.mood_label }}</span>
                  <span v-else class="text-sm">{{ prefs.t('diaryUnwritten') }}</span>
                </div>
                <div v-if="isDiaryEntry(entry) && entry.id !== null" class="flex items-center gap-8">
                  <button class="diary-pin" :class="{ pinned: entry.pinned }"
                    @click.stop="togglePin(entry.id)">📌</button>
                  <button class="btn btn-sm btn-danger" @click.stop="askDelete(entry.id)">{{ prefs.t('commonDelete') }}</button>
                </div>
              </div>
              <div v-if="isDiaryEntry(entry)" class="diary-entry-body mb-12">
                <div v-if="searchMode" class="diary-entry-content" v-html="highlightText(entry.content, searchQuery)"></div>
                <div v-else class="diary-entry-content diary-markdown" v-html="renderMarkdown(entry.content)"></div>
              </div>
              <p v-else class="text-sm diary-linked-only-note mb-12">{{ prefs.t('diaryLinkedOnly') }}</p>
              <div class="tag-row" v-if="entry.tags && entry.tags.length > 0">
                <span v-for="tag in entry.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
              <div v-if="entry.finance_records?.length" class="diary-linked-list" @click.stop>
                <div class="diary-linked-title">{{ prefs.t('diaryLinkedFinance') }}</div>
                <div
                  v-for="record in entry.finance_records"
                  :key="record.id"
                  class="diary-finance-item">
                  <span class="diary-finance-kind" :class="record.type">
                    {{ record.type === 'income' ? prefs.t('commonIncome') : prefs.t('commonExpense') }}
                  </span>
                  <span class="diary-finance-category">{{ record.category }}</span>
                  <span class="diary-finance-amount" :class="record.type">
                    {{ record.type === 'income' ? '+' : '-' }}{{ formatMoney(record.amount) }}
                  </span>
                  <span v-if="record.note" class="diary-linked-detail"> · {{ record.note }}</span>
                </div>
              </div>
              <div v-if="entry.kanban_activity?.length" class="diary-kanban-activity" @click.stop>
                <div class="diary-linked-title">{{ prefs.t('diaryLinkedKanban') }}</div>
                <div
                  v-for="activity in entry.kanban_activity"
                  :key="activity.id"
                  class="diary-kanban-item">
                  <time class="diary-kanban-time">{{ formatActivityTime(activity.created_at) }}</time>
                  <span class="diary-kanban-text">
                    {{ activityLabel(activity) }}
                    <span v-if="activity.board_name" class="diary-kanban-board">「{{ activity.board_name }}」</span>
                    <span> {{ activity.entity_title }}</span>
                    <span v-if="activity.details" class="diary-linked-detail"> · {{ activity.details }}</span>
                  </span>
                </div>
              </div>
            </div>
            <EmptyState v-if="filteredEntries.length === 0 && !searchMode" icon="📝" :text="prefs.t('diaryEmptyList')" />
          </div>
          </section>
        </div>
      </section>

      <!-- Write / Edit Modal -->
      <AppModal :visible="showModal" @close="showModal = false">
        <h2 class="heading-md mb-20">{{ editingId ? prefs.t('diaryEdit') : prefs.t('diaryWrite') }}</h2>
        <div class="form-group mb-16">
          <label class="form-label">{{ prefs.t('commonDate') }}</label>
          <input type="date" class="input" v-model="form.date">
        </div>
        <div class="form-group mb-16">
          <label class="form-label">{{ prefs.t('diaryMood') }}</label>
          <div class="mood-filter">
            <button v-for="mood in MOODS" :key="mood.emoji"
              :class="{ active: form.mood === mood.emoji }"
              @click="form.mood = mood.emoji; form.mood_label = mood.label">
              {{ mood.emoji }}
            </button>
          </div>
        </div>
        <div class="form-group mb-16">
          <label class="form-label">{{ prefs.t('diaryContent') }}</label>
          <textarea class="input" v-model="form.content" rows="6" :placeholder="prefs.t('diaryContentPlaceholder')"></textarea>
        </div>
        <div class="form-group mb-20">
          <label class="form-label">{{ prefs.t('diaryTags') }}</label>
          <input class="input" v-model="form.tagsStr" :placeholder="prefs.t('diaryTagsPlaceholder')">
        </div>
        <p v-if="formError" class="text-sm" style="color: var(--color-danger); margin-bottom: 12px;">{{ formError }}</p>
        <div class="flex gap-12" style="justify-content: flex-end;">
          <button v-if="editingId" class="btn btn-danger" @click="askDelete(editingId!)">{{ prefs.t('commonDelete') }}</button>
          <div style="flex:1;"></div>
          <button class="btn" @click="showModal = false">{{ prefs.t('commonCancel') }}</button>
          <button class="btn btn-filled" @click="saveEntry">{{ prefs.t('commonSave') }}</button>
        </div>
      </AppModal>

      <!-- Delete Confirm Modal -->
      <AppModal :visible="showDeleteConfirm" @close="showDeleteConfirm = false">
        <h2 class="heading-md mb-12">{{ prefs.t('commonDelete') }}</h2>
        <p class="text-body mb-20">{{ prefs.t('diaryDeleteConfirm') }}</p>
        <div class="flex gap-12" style="justify-content: flex-end;">
          <button class="btn" @click="showDeleteConfirm = false">{{ prefs.t('commonCancel') }}</button>
          <button class="btn btn-danger" @click="confirmDelete">{{ prefs.t('commonDelete') }}</button>
        </div>
      </AppModal>
    </main>
  </PasswordGate>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, type ComponentPublicInstance } from 'vue'
import { api } from '../composables/useApi'
import { useAuthStore } from '../stores/auth'
import PasswordGate from '../components/PasswordGate.vue'
import AppModal from '../components/AppModal.vue'
import EmptyState from '../components/EmptyState.vue'
import { PIE_COLORS } from '../constants/chart'
import { usePreferencesStore } from '../stores/preferences'
import { marked } from 'marked'

interface DiaryEntry {
  id: number | null; date: string; mood: string; mood_label: string
  content: string; tags: string[]; pinned: number; created_at: number | null; updated_at: number | null
  has_diary?: boolean
  kanban_activity?: KanbanActivity[]
  finance_records?: FinanceRecord[]
}

interface FinanceRecord {
  id: number
  type: 'income' | 'expense'
  amount: number
  category: string
  note: string
}

interface KanbanActivity {
  id: number
  action: 'create' | 'update' | 'delete' | 'move'
  entity_type: 'board' | 'column' | 'todo'
  entity_title: string
  board_name: string
  details: string
  created_at: number
}

interface MoodStat { mood: string; mood_label: string; count: number }
interface CalendarDay { date: string; mood: string; id: number }

const authStore = useAuthStore()
const prefs = usePreferencesStore()

const MOODS = computed(() => [
  { emoji: '😊', label: prefs.t('moodHappy') }, { emoji: '😌', label: prefs.t('moodCalm') },
  { emoji: '😢', label: prefs.t('moodSad') }, { emoji: '😤', label: prefs.t('moodAngry') },
  { emoji: '🤔', label: prefs.t('moodThinking') }, { emoji: '😴', label: prefs.t('moodTired') },
  { emoji: '🥳', label: prefs.t('moodExcited') }, { emoji: '🚀', label: prefs.t('moodProductive') },
])

const WEEKDAYS = computed(() => [
  prefs.t('weekdayMon'),
  prefs.t('weekdayTue'),
  prefs.t('weekdayWed'),
  prefs.t('weekdayThu'),
  prefs.t('weekdayFri'),
  prefs.t('weekdaySat'),
  prefs.t('weekdaySun'),
])

// ── View state ───
const now = new Date()
const viewYear = ref(now.getFullYear())
const viewMonth = ref(now.getMonth() + 1)
const selectedDate = ref('')
const searchQuery = ref('')
const searchMode = ref(false)
const searchResults = ref<DiaryEntry[]>([])
const filterMood = ref('')
const filterTag = ref('')
const showMonthPicker = ref(false)
const pickerYear = ref(viewYear.value)
const monthPickerRef = ref<HTMLElement | null>(null)
const entryCardRefs = new Map<string, HTMLElement>()
const pendingScrollDate = ref('')

// ── Data ───
const entries = ref<DiaryEntry[]>([])
const moodStats = ref<MoodStat[]>([])
const calendarData = ref<CalendarDay[]>([])

// ── Modal ───
const showModal = ref(false)
const editingId = ref<number | null>(null)
const form = ref({ date: '', mood: '', mood_label: '', content: '', tagsStr: '' })
const formError = ref('')
const showDeleteConfirm = ref(false)
const pendingDeleteId = ref<number | null>(null)

// ── Debounce timer ───
let searchTimer: ReturnType<typeof setTimeout> | null = null

// ── Computed ───
const isCurrentMonth = computed(() => viewYear.value === now.getFullYear() && viewMonth.value === now.getMonth() + 1)

const filteredEntries = computed(() => {
  let list = searchMode.value ? searchResults.value : entries.value
  if (filterMood.value) list = list.filter(e => e.mood === filterMood.value)
  if (filterTag.value) list = list.filter(e => e.tags?.includes(filterTag.value))
  return list
})

const monthTags = computed(() => {
  const src = searchMode.value ? searchResults.value : entries.value
  const all = src.flatMap(e => e.tags || [])
  return [...new Set(all)].slice(0, 12)
})

const topMood = computed(() => moodStats.value[0] || null)

const topTags = computed(() => {
  const freq: Record<string, number> = {}
  for (const e of entries.value) {
    for (const t of (e.tags || [])) { freq[t] = (freq[t] || 0) + 1 }
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t)
})

const totalMoodCount = computed(() => moodStats.value.reduce((a, b) => a + b.count, 0))

const moodPieGradient = computed(() => {
  const stats = moodStats.value
  if (stats.length === 0) return 'var(--color-tag-bg)'
  let acc = 0
  const stops: string[] = []
  for (let i = 0; i < stats.length; i++) {
    const color = PIE_COLORS[i % PIE_COLORS.length]
    const start = acc
    const pct = totalMoodCount.value > 0 ? (stats[i].count / totalMoodCount.value) * 100 : 0
    acc += pct
    stops.push(`${color} ${start}% ${acc}%`)
  }
  return `conic-gradient(${stops.join(', ')})`
})

// Calendar cells generation
const calendarCells = computed(() => {
  const year = viewYear.value
  const month = viewMonth.value - 1
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()

  // Monday = 0, Sunday = 6
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const cells: { day: number; date: string; mood: string; isToday: boolean; isCurrentMonth: boolean; entryId: number | null }[] = []

  const calMap: Record<string, CalendarDay> = {}
  for (const c of calendarData.value) { calMap[c.date] = c }

  const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`

  // Previous month padding
  const prevLast = new Date(year, month, 0).getDate()
  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevLast - i
    const pm = month === 0 ? 12 : month
    const py = month === 0 ? year - 1 : year
    const ds = `${py}-${pm.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
    const cal = calMap[ds]
    cells.push({
      day: d,
      date: ds,
      mood: cal?.mood || '',
      isToday: ds === todayStr,
      isCurrentMonth: false,
      entryId: cal?.id || null,
    })
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
    const cal = calMap[ds]
    cells.push({
      day: d, date: ds,
      mood: cal?.mood || '',
      isToday: ds === todayStr,
      isCurrentMonth: true,
      entryId: cal?.id || null,
    })
  }

  // Next month padding (fill to 42 cells = 6 rows)
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const nm = month + 2 > 12 ? 1 : month + 2
    const ny = month + 2 > 12 ? year + 1 : year
    const ds = `${ny}-${nm.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
    const cal = calMap[ds]
    cells.push({
      day: d,
      date: ds,
      mood: cal?.mood || '',
      isToday: ds === todayStr,
      isCurrentMonth: false,
      entryId: cal?.id || null,
    })
  }

  return cells
})

// ── Helpers ───
function renderMarkdown(text: string): string {
  return marked.parse(text || '', { breaks: true, async: false }) as string
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string
  ))
}

function highlightText(text: string, query: string): string {
  const safe = escapeHtml(text || '')
  const q = query.trim()
  if (!q) return safe
  const pattern = escapeHtml(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return safe.replace(new RegExp(pattern, 'gi'), (m) => `<mark>${m}</mark>`)
}

function formatActivityTime(epochSeconds: number) {
  return new Date(epochSeconds * 1000).toLocaleTimeString(prefs.language, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatMoney(amount: number) {
  return '¥' + Number(amount || 0).toLocaleString(prefs.language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function activityLabel(activity: KanbanActivity) {
  const actionMap = {
    create: prefs.t('activityCreate'),
    update: prefs.t('activityUpdate'),
    delete: prefs.t('activityDelete'),
    move: prefs.t('activityMove'),
  }
  const entityMap = {
    board: prefs.t('activityBoard'),
    column: prefs.t('activityColumn'),
    todo: prefs.t('activityTodo'),
  }
  return `${actionMap[activity.action]}${entityMap[activity.entity_type]}`
}

function isDiaryEntry(entry: DiaryEntry) {
  return entry.has_diary !== false
}

function setEntryCardRef(date: string, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLElement) entryCardRefs.set(date, el)
  else entryCardRefs.delete(date)
}

async function scrollToEntryDate(date: string) {
  await nextTick()
  const target = entryCardRefs.get(date)
  if (!target) return false
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return true
}

function formatMonthLabel(year: number, month: number) {
  return prefs.tr('commonMonthFormat', { year, month })
}

function formatYearLabel(year: number) {
  return prefs.tr('commonYearFormat', { year })
}

function formatShortMonth(month: number) {
  return `${month}${prefs.t('commonMonthUnit')}`
}

// ── Navigation ───
function prevMonth() {
  if (viewMonth.value === 1) { viewMonth.value = 12; viewYear.value-- }
  else { viewMonth.value-- }
}

function nextMonth() {
  if (viewMonth.value === 12) { viewMonth.value = 1; viewYear.value++ }
  else { viewMonth.value++ }
}

function goToday() {
  viewYear.value = now.getFullYear()
  viewMonth.value = now.getMonth() + 1
}

function setViewMonth(year: number, month: number) {
  viewYear.value = year
  viewMonth.value = month
  pickerYear.value = year
}

function toggleMonthPicker() {
  pickerYear.value = viewYear.value
  showMonthPicker.value = !showMonthPicker.value
}

function selectPickerMonth(month: number) {
  setViewMonth(pickerYear.value, month)
  showMonthPicker.value = false
}

function closeMonthPickerOnOutside(event: PointerEvent) {
  if (!showMonthPicker.value) return
  const target = event.target as Node | null
  if (target && monthPickerRef.value?.contains(target)) return
  showMonthPicker.value = false
}

function parseDateParts(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return { year, month, day }
}

// ── Data loading ───
async function loadData() {
  if (!authStore.authed) return
  try {
    const visibleMonths = getVisibleMonths(viewYear.value, viewMonth.value)
    const [entryData, statsData, calData] = await Promise.all([
      api<DiaryEntry[]>(`/api/diary?year=${viewYear.value}&month=${viewMonth.value}`),
      api<MoodStat[]>(`/api/diary/stats?year=${viewYear.value}&month=${viewMonth.value}`),
      Promise.all(visibleMonths.map(({ year, month }) => (
        api<CalendarDay[]>(`/api/diary/calendar?year=${year}&month=${month}`)
      ))),
    ])
    entries.value = entryData
    moodStats.value = statsData
    calendarData.value = calData.flat()
    if (pendingScrollDate.value) {
      const targetDate = pendingScrollDate.value
      pendingScrollDate.value = ''
      scrollToEntryDate(targetDate)
    }
  } catch (e) {
    console.error('Failed to load diary data:', e)
  }
}

function getVisibleMonths(year: number, month: number) {
  const keys = new Set<string>()
  const months: { year: number; month: number }[] = []

  for (const offset of [-1, 0, 1]) {
    const date = new Date(year, month - 1 + offset, 1)
    const item = { year: date.getFullYear(), month: date.getMonth() + 1 }
    const key = `${item.year}-${item.month}`
    if (!keys.has(key)) {
      keys.add(key)
      months.push(item)
    }
  }

  return months
}

// ── Search ───
function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  if (!searchQuery.value.trim()) {
    searchMode.value = false
    searchResults.value = []
    return
  }
  searchTimer = setTimeout(async () => {
    if (!authStore.authed) return
    searchMode.value = true
    searchResults.value = await api<DiaryEntry[]>(`/api/diary/search?q=${encodeURIComponent(searchQuery.value)}`)
  }, 300)
}

function clearSearch() {
  searchQuery.value = ''
  searchMode.value = false
  searchResults.value = []
}

// ── Calendar click ───
async function onCalendarClick(cell: { date: string; entryId: number | null; isCurrentMonth: boolean }) {
  selectedDate.value = cell.date
  if (!cell.isCurrentMonth) {
    const { year, month } = parseDateParts(cell.date)
    pendingScrollDate.value = cell.date
    setViewMonth(year, month)
    return
  }

  scrollToEntryDate(cell.date)
}

// ── Modal ───
function openDailyCard(entry: DiaryEntry) {
  if (isDiaryEntry(entry)) openModal(entry)
  else openModal(undefined, entry.date)
}

function openModal(entry?: DiaryEntry, prefillDate?: string) {
  formError.value = ''
  if (entry) {
    editingId.value = entry.id
    form.value = {
      date: entry.date,
      mood: entry.mood,
      mood_label: entry.mood_label,
      content: entry.content,
      tagsStr: (entry.tags || []).join(', '),
    }
  } else {
    editingId.value = null
    form.value = {
      date: prefillDate || new Date().toISOString().split('T')[0],
      mood: '', mood_label: '', content: '', tagsStr: '',
    }
  }
  showModal.value = true
}

async function saveEntry() {
  formError.value = ''
  if (!form.value.date || !form.value.content) { formError.value = prefs.t('diaryNeedDateContent'); return }
  const tags = form.value.tagsStr ? form.value.tagsStr.split(',').map(s => s.trim()).filter(Boolean) : []

  if (editingId.value !== null) {
    await api(`/api/diary/${editingId.value}`, {
      method: 'PATCH',
      body: JSON.stringify({
        date: form.value.date, mood: form.value.mood,
        mood_label: form.value.mood_label, content: form.value.content, tags,
      }),
    })
  } else {
    await api('/api/diary', {
      method: 'POST',
      body: JSON.stringify({
        date: form.value.date, mood: form.value.mood,
        mood_label: form.value.mood_label, content: form.value.content, tags,
      }),
    })
  }
  showModal.value = false
  loadData()
}

function askDelete(id: number) {
  pendingDeleteId.value = id
  showDeleteConfirm.value = true
  showModal.value = false
}

async function confirmDelete() {
  const id = pendingDeleteId.value
  showDeleteConfirm.value = false
  pendingDeleteId.value = null
  if (id === null) return
  await api(`/api/diary/${id}`, { method: 'DELETE' })
  entries.value = entries.value.filter(e => e.id !== id)
  searchResults.value = searchResults.value.filter(e => e.id !== id)
  loadData()
}

async function togglePin(id: number) {
  const updated = await api<DiaryEntry>(`/api/diary/${id}/pin`, { method: 'PATCH' })
  for (const list of [entries.value, searchResults.value]) {
    const e = list.find(x => x.id === id)
    if (e) e.pinned = updated.pinned
  }
  entries.value = [...entries.value].sort(
    (a, b) => (Number(b.pinned || 0) - Number(a.pinned || 0)) || b.date.localeCompare(a.date),
  )
}

// ── Watchers ───
watch([viewYear, viewMonth], () => {
  if (authStore.authed) loadData()
})

watch(() => authStore.authed, (authed) => {
  if (authed) loadData()
}, { immediate: true })

onMounted(() => {
  document.addEventListener('pointerdown', closeMonthPickerOnOutside)
  if (!authStore.checked) {
    authStore.check()
  }
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', closeMonthPickerOnOutside)
})
</script>

<style scoped>
.diary-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.diary-workspace-section {
  flex: 1;
  min-height: 0;
  padding: 0;
}

.diary-workspace {
  width: 100%;
  max-width: 1720px;
  margin: 0 auto;
  padding: 0 24px;
  height: 100%;
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 20px;
  align-items: stretch;
  min-height: 0;
}

.diary-sidebar {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.diary-panel {
  min-width: 0;
}

.diary-side-card {
  padding: 24px;
}

.diary-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.diary-add-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-accent);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.9rem;
  line-height: 1;
  box-shadow: var(--shadow-sm);
  transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
}

.diary-add-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
  background: var(--color-ink);
}

.diary-filter-panel {
  display: flex;
  flex-direction: column;
}

.diary-filter-panel > * + * {
  border-top: var(--border-light);
  margin-top: 12px;
  padding-top: 12px;
}

.diary-filter-panel .diary-search {
  width: 100%;
  max-width: none;
}

.diary-filter-group {
  background: var(--color-card);
}

.diary-filter-group .mood-filter,
.diary-filter-group .tag-row {
  gap: 8px;
}

.diary-filter-group .mood-filter button {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: var(--color-card);
}

.diary-filter-group .mood-filter button.active {
  background: var(--color-ink);
  box-shadow: inset 0 0 0 1px var(--color-ink);
}

.diary-filter-group .tag.active {
  border-color: var(--color-ink);
  background: var(--color-ink);
  color: #fff;
}

.diary-content {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.diary-search-hint {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.diary-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.diary-calendar-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  text-align: center;
}

.diary-month-nav {
  justify-content: center;
}

.diary-month-nav .month-label,
.diary-month-nav .month-picker-trigger {
  min-width: 150px;
}

.diary-stats-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.diary-stat-hero {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}

.diary-stat-hero .pie-chart {
  width: 128px;
  height: 128px;
}

.diary-stat-hero .stat-number {
  font-size: 1.8rem;
  line-height: 1;
}

.diary-top-mood {
  font-size: 1.8rem;
  line-height: 1;
}

.diary-mood-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.diary-mood-stat {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  border-top: var(--border-light);
  font-size: .82rem;
}

.diary-stat-row {
  margin-top: 16px;
  padding-top: 14px;
  border-top: var(--border-light);
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.diary-linked-only-card {
  border-style: dashed;
}

.diary-selected-card {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 18%, transparent);
}

.diary-linked-only-note {
  color: var(--color-muted);
}

.diary-linked-list,
.diary-kanban-activity {
  margin-top: 14px;
  padding-top: 12px;
  border-top: var(--border-light);
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: default;
}

.diary-linked-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-muted);
}

.diary-finance-item,
.diary-kanban-item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 0.82rem;
  line-height: 1.5;
}

.diary-finance-kind {
  flex: 0 0 auto;
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--color-muted);
}

.diary-finance-kind.income {
  color: var(--color-accent);
}

.diary-finance-kind.expense {
  color: var(--color-danger);
}

.diary-finance-category {
  min-width: 0;
}

.diary-finance-amount {
  flex: 0 0 auto;
  margin-left: auto;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.diary-finance-amount.income {
  color: var(--color-accent);
}

.diary-finance-amount.expense {
  color: var(--color-danger);
}

.diary-kanban-time {
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
  color: var(--color-muted);
}

.diary-kanban-text {
  min-width: 0;
  color: var(--color-ink);
}

.diary-kanban-board,
.diary-linked-detail {
  color: var(--color-muted);
}

/* Rendered diary content (markdown / search highlight) */
.diary-entry-content {
  position: relative;
  max-height: 200px;
  overflow: hidden;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--color-ink);
  word-break: break-word;
  white-space: pre-wrap;
}

.diary-markdown {
  white-space: normal;
}

.diary-entry-content::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 28px;
  background: linear-gradient(transparent, var(--color-card));
  pointer-events: none;
}

.diary-markdown :where(p, ul, ol) {
  margin: 0 0 0.5em;
}

.diary-markdown :where(p, ul, ol):last-child {
  margin-bottom: 0;
}

.diary-markdown :where(ul, ol) {
  padding-left: 1.3em;
}

.diary-markdown :where(h1, h2, h3, h4) {
  font-size: 1rem;
  font-weight: 600;
  margin: 0.4em 0;
}

.diary-markdown a {
  color: var(--color-accent);
}

.diary-markdown code {
  background: var(--color-tag-bg);
  padding: 0.1em 0.35em;
  border-radius: 4px;
  font-size: 0.85em;
}

.diary-markdown pre {
  background: var(--color-tag-bg);
  padding: 0.6em 0.8em;
  border-radius: 8px;
  overflow-x: auto;
}

.diary-markdown pre code {
  background: none;
  padding: 0;
}

.diary-markdown blockquote {
  border-left: 3px solid var(--color-border);
  margin: 0.4em 0;
  padding-left: 0.8em;
  color: var(--color-muted);
}

.diary-entry-content mark {
  background: color-mix(in srgb, var(--color-accent) 30%, transparent);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}

@media (max-width: 980px) {
  .diary-page {
    display: block;
    overflow: visible;
  }

  .diary-workspace-section {
    padding-bottom: 24px;
  }

  .diary-workspace {
    grid-template-columns: 1fr;
    padding: 0 16px;
    height: auto;
  }

  .diary-sidebar {
    overflow: visible;
    padding-right: 0;
  }

  .diary-content {
    overflow: visible;
    padding-right: 0;
  }
}

@media (max-width: 520px) {
  .diary-stat-hero {
    grid-template-columns: 1fr 1fr;
  }

  .diary-stat-hero .pie-chart {
    grid-column: 1 / -1;
    justify-self: center;
  }
}
</style>
