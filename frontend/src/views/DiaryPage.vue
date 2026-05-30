<template>
  <PasswordGate>
    <main>
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

            <div v-if="!searchMode" class="card card-pad-sm diary-panel">
              <div class="diary-filter-panel">
                <span class="text-sm" style="font-weight:500;">{{ prefs.t('diaryFilter') }}</span>
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

            <div v-if="!searchMode" class="card card-pad-lg diary-panel">
              <div class="diary-calendar-head">
                <h3 class="heading-md">{{ prefs.t('diaryCalendar') }}</h3>
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

            <div v-if="!searchMode" class="card card-pad-lg diary-panel">
              <h3 class="heading-md mb-16">{{ prefs.t('diaryMoodTrend') }}</h3>
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
            <div class="diary-search diary-content-search">
              <span class="search-icon">🔍</span>
              <input v-model="searchQuery" :placeholder="prefs.t('diarySearchPlaceholder')" @input="onSearch">
            </div>
            <div v-if="searchMode" class="diary-search-hint">
              <span class="text-sm">{{ prefs.tr('commonSearchResult', { query: searchQuery, count: filteredEntries.length }) }}</span>
              <button class="btn btn-sm" @click="clearSearch">{{ prefs.t('commonClear') }}</button>
            </div>

            <div class="diary-list">
            <div v-for="entry in filteredEntries" :key="entry.id ?? `linked-${entry.date}`" class="card card-pad fade-up"
              :class="{ 'diary-linked-only-card': !isDiaryEntry(entry) }"
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
                  <button class="btn btn-sm btn-danger" @click.stop="deleteEntry(entry.id)">{{ prefs.t('commonDelete') }}</button>
                </div>
              </div>
              <p v-if="isDiaryEntry(entry)" class="text-body mb-12">{{ truncate(entry.content, 120) }}</p>
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
          <button v-if="editingId" class="btn btn-danger" @click="deleteEntry(editingId!); showModal = false">{{ prefs.t('commonDelete') }}</button>
          <div style="flex:1;"></div>
          <button class="btn" @click="showModal = false">{{ prefs.t('commonCancel') }}</button>
          <button class="btn btn-filled" @click="saveEntry">{{ prefs.t('commonSave') }}</button>
        </div>
      </AppModal>
    </main>
  </PasswordGate>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { api } from '../composables/useApi'
import { useAuthStore } from '../stores/auth'
import PasswordGate from '../components/PasswordGate.vue'
import AppModal from '../components/AppModal.vue'
import EmptyState from '../components/EmptyState.vue'
import { PIE_COLORS } from '../constants/chart'
import { usePreferencesStore } from '../stores/preferences'

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

// ── Data ───
const entries = ref<DiaryEntry[]>([])
const moodStats = ref<MoodStat[]>([])
const calendarData = ref<CalendarDay[]>([])

// ── Modal ───
const showModal = ref(false)
const editingId = ref<number | null>(null)
const form = ref({ date: '', mood: '', mood_label: '', content: '', tagsStr: '' })
const formError = ref('')

// ── Debounce timer ───
let searchTimer: ReturnType<typeof setTimeout> | null = null

// ── Computed ───
const isCurrentMonth = computed(() => viewYear.value === now.getFullYear() && viewMonth.value === now.getMonth() + 1)

const filteredEntries = computed(() => {
  if (searchMode.value) return searchResults.value
  let list = entries.value
  if (filterMood.value) list = list.filter(e => e.mood === filterMood.value)
  if (filterTag.value) list = list.filter(e => e.tags?.includes(filterTag.value))
  return list
})

const monthTags = computed(() => {
  const all = entries.value.flatMap(e => e.tags || [])
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
function truncate(text: string, len: number) {
  return text.length > len ? text.slice(0, len) + '...' : text
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
function onCalendarClick(cell: { date: string; entryId: number | null; isCurrentMonth: boolean }) {
  selectedDate.value = cell.date
  if (!cell.isCurrentMonth) {
    const { year, month } = parseDateParts(cell.date)
    setViewMonth(year, month)
  }

  if (cell.entryId) {
    openEntryById(cell.entryId, cell.date)
  } else {
    openModal(undefined, cell.date)
  }
}

async function openEntryById(entryId: number, date: string) {
  const localEntry = entries.value.find(e => e.id === entryId)
  if (localEntry) {
    openModal(localEntry)
    return
  }

  try {
    const { year, month } = parseDateParts(date)
    const monthEntries = await api<DiaryEntry[]>(`/api/diary?year=${year}&month=${month}`)
    const entry = monthEntries.find(e => e.id === entryId)
    if (entry) openModal(entry)
    else openModal(undefined, date)
  } catch {
    openModal(undefined, date)
  }
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
  if (!form.value.mood) { formError.value = prefs.t('diaryNeedMood'); return }
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

async function deleteEntry(id: number) {
  if (!confirm(prefs.t('diaryDeleteConfirm'))) return
  await api(`/api/diary/${id}`, { method: 'DELETE' })
  loadData()
}

async function togglePin(id: number) {
  await api(`/api/diary/${id}/pin`, { method: 'PATCH' })
  loadData()
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
.diary-workspace-section {
  padding-top: 24px;
}

.diary-workspace {
  width: 100%;
  max-width: 1720px;
  margin: 0 auto;
  padding: 0 24px;
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.diary-sidebar {
  position: sticky;
  top: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: calc(100vh - 36px);
  overflow-y: auto;
  padding-right: 2px;
}

.diary-panel {
  min-width: 0;
}

.diary-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.diary-add-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--color-ink);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  line-height: 1;
  box-shadow: var(--shadow-sm);
  transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
}

.diary-add-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
  background: var(--color-accent);
}

.diary-filter-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.diary-filter-group {
  padding: 10px;
  border: var(--border-light);
  border-radius: var(--radius-sm);
  background: var(--color-tag-bg);
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
  border: var(--border-light);
  background: var(--color-card);
}

.diary-filter-group .mood-filter button.active {
  border-color: var(--color-ink);
  background: var(--color-ink);
}

.diary-filter-group .tag.active {
  border-color: var(--color-ink);
  background: var(--color-ink);
  color: #fff;
}

.diary-content {
  min-width: 0;
}

.diary-content-search {
  width: min(420px, 100%);
  max-width: none;
  margin: 0 0 14px auto;
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
  margin-bottom: 16px;
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

@media (max-width: 980px) {
  .diary-workspace {
    grid-template-columns: 1fr;
    padding: 0 16px;
  }

  .diary-sidebar {
    position: static;
    max-height: none;
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

  .diary-content-search {
    width: 100%;
  }
}
</style>
