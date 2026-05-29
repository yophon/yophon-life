<template>
  <PasswordGate>
    <main>
      <!-- Header -->
      <section class="section">
        <div class="container">
          <div class="card card-pad-lg fade-up">
            <div class="flex justify-between items-center" style="flex-wrap: wrap; gap: 16px;">
              <div>
                <p class="text-sm"></p>
                <h1 class="heading-xl">{{ prefs.t('financeTitle') }}</h1>
              </div>
              <div class="flex gap-8" style="flex-wrap:wrap;">
                <button class="btn btn-sm" @click="openCategoryModal">{{ prefs.t('financeCategoryManage') }}</button>
                <button class="btn btn-sm" @click="openBudgetModal">{{ prefs.t('financeBudgetSettings') }}</button>
                <button class="btn btn-filled" @click="openTxModal()">+ {{ prefs.t('financeAddTransaction') }}</button>
              </div>
            </div>
            <!-- Month nav -->
            <div style="margin-top:20px;" class="flex items-center gap-16">
              <div class="finance-month-nav">
                <button @click="prevMonth">←</button>
                <span class="month-label" @click="toggleYearView">
                  {{ yearView ? formatYearLabel(viewYear) : formatMonthLabel(viewYear, viewMonth) }}
                </span>
                <button @click="nextMonth">→</button>
              </div>
              <button v-if="!isCurrentMonth" class="btn btn-sm" @click="goToday">{{ prefs.t('commonBackThisMonth') }}</button>
            </div>
          </div>
        </div>
      </section>

      <!-- Summary -->
      <section style="padding: 20px 0;">
        <div class="container">
          <div class="card card-split finance-summary fade-up">
            <div class="card-pad" style="text-align: center; padding: 32px;">
              <p class="text-sm mb-8">{{ yearView ? prefs.t('financeYearIncome') : prefs.t('financeMonthIncome') }}</p>
              <p class="finance-amount income">{{ fmt(summary.income) }}</p>
            </div>
            <div class="card-pad" style="text-align: center; padding: 32px;">
              <p class="text-sm mb-8">{{ yearView ? prefs.t('financeYearExpense') : prefs.t('financeMonthExpense') }}</p>
              <p class="finance-amount expense">{{ fmt(summary.expense) }}</p>
            </div>
            <div class="card-pad" style="text-align: center; padding: 32px;">
              <p class="text-sm mb-8">{{ yearView ? prefs.t('financeYearBalance') : prefs.t('financeMonthBalance') }}</p>
              <p class="finance-amount" :style="{ color: summary.balance >= 0 ? 'var(--color-accent)' : 'var(--color-danger)' }">
                {{ fmt(summary.balance) }}
              </p>
              <div v-if="totalBudget > 0 && !yearView" class="budget-bar-wrap" style="margin-top:12px;">
                <div class="budget-bar">
                  <div class="budget-bar-fill" :class="{ over: summary.expense > totalBudget }"
                    :style="{ width: Math.min(100, (summary.expense / totalBudget) * 100) + '%' }"></div>
                </div>
                <div class="budget-bar-label">
                  <span>{{ prefs.t('commonSpent') }} {{ fmt(summary.expense) }}</span>
                  <span>{{ prefs.t('commonBudget') }} {{ fmt(totalBudget) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Charts: trend + pie -->
      <section style="padding-bottom: 20px;">
        <div class="container">
          <div class="grid-2 fade-up" style="gap:16px;">
            <!-- Bar chart -->
            <div class="card card-pad-lg">
              <h3 class="heading-md mb-20">{{ prefs.t('financeMonthlyTrend') }}</h3>
              <div class="chart-bars">
                <div v-for="t in trends" :key="t.month" class="chart-bar-wrap"
                  style="cursor:pointer;" @click="jumpToMonth(t.month)">
                  <div style="display:flex;gap:4px;align-items:flex-end;width:100%;height:100%;">
                    <div class="chart-bar income" :style="{ height: barHeight(t.income) + '%', flex: 1 }"></div>
                    <div class="chart-bar expense" :style="{ height: barHeight(t.expense) + '%', flex: 1 }"></div>
                  </div>
                  <span class="chart-label">{{ Number(t.month.split('-')[1]) }}{{ prefs.t('commonMonthUnit') }}</span>
                </div>
              </div>
              <div class="flex gap-16" style="margin-top: 8px;">
                <span class="text-xs flex items-center gap-8">
                  <span style="width:10px;height:10px;background:var(--color-accent-light);border:var(--border);border-radius:2px;display:inline-block;"></span> {{ prefs.t('commonIncome') }}
                </span>
                <span class="text-xs flex items-center gap-8">
                  <span style="width:10px;height:10px;background:var(--color-danger-light);border:var(--border);border-radius:2px;display:inline-block;"></span> {{ prefs.t('commonExpense') }}
                </span>
              </div>
            </div>

            <!-- Pie chart -->
            <div class="card card-pad-lg">
              <h3 class="heading-md mb-20">{{ prefs.t('financeExpenseCategory') }}</h3>
              <div v-if="expenseStats.length > 0" class="pie-chart-wrap">
                <div class="pie-chart" :style="{ background: pieGradient }"></div>
                <div class="pie-legend">
                  <div v-for="(s, i) in expenseStats" :key="s.category" class="pie-legend-item">
                    <span class="pie-legend-dot" :style="{ background: PIE_COLORS[i % PIE_COLORS.length] }"></span>
                    <span>{{ catIcon(s.category) }} {{ s.category }}</span>
                    <span class="legend-pct">{{ s.pct }}%</span>
                  </div>
                </div>
              </div>
              <EmptyState v-else :text="prefs.t('financeNoExpenseData')" />
            </div>
          </div>
        </div>
      </section>

      <!-- Transactions -->
      <section class="section" style="padding-top: 0;">
        <div class="container">
          <div class="card card-stack fade-up">
            <div class="card-pad">
              <div class="flex justify-between items-center">
                <h3 class="heading-md">{{ prefs.t('financeTransactionRecords') }}</h3>
                <div class="tag-row">
                  <span v-for="f in FILTERS" :key="f.key" class="tag"
                    :class="{ active: activeFilter === f.key }" @click="activeFilter = f.key">
                    {{ f.label }}
                  </span>
                </div>
              </div>
            </div>
            <div class="card-pad" style="padding-top: 0;">
              <div v-for="tx in filteredTx" :key="tx.id" class="transaction-row" style="cursor:pointer;" @click="openTxModal(tx)">
                <div class="transaction-icon">{{ catIcon(tx.category) }}</div>
                <div class="transaction-info">
                  <p style="font-weight: 500; font-size: .9rem;">{{ tx.category }}</p>
                  <p class="text-sm">{{ tx.date }}{{ tx.note ? ' · ' + tx.note : '' }}</p>
                </div>
                <span class="transaction-amount" :class="tx.type">
                  {{ tx.type === 'income' ? '+' : '-' }}{{ fmt(tx.amount) }}
                </span>
                <button style="opacity:.3;font-size:.8rem;margin-left:8px;" @click.stop="deleteTx(tx.id)">✕</button>
              </div>
              <EmptyState v-if="filteredTx.length === 0" :text="prefs.t('financeNoRecords')" />
            </div>
          </div>
        </div>
      </section>

      <!-- Transaction Modal (create / edit) -->
      <AppModal :visible="showTxModal" @close="showTxModal = false">
        <h2 class="heading-md mb-20">{{ editingTxId ? prefs.t('financeEditTransaction') : prefs.t('financeAddTransaction') }}</h2>
        <div class="form-group mb-16">
          <label class="form-label">{{ prefs.t('commonType') }}</label>
          <div class="flex gap-8">
            <button v-for="t in ['income', 'expense']" :key="t" class="btn btn-sm" style="flex:1;"
              :style="{ background: txForm.type === t ? 'var(--color-ink)' : '', color: txForm.type === t ? '#fff' : '' }"
              @click="txForm.type = t; txForm.category = ''">
              {{ t === 'income' ? prefs.t('commonIncome') : prefs.t('commonExpense') }}
            </button>
          </div>
        </div>
        <div class="form-group mb-16">
          <label class="form-label">{{ prefs.t('commonAmount') }}</label>
          <input type="number" class="input" v-model.number="txForm.amount" placeholder="0.00" step="0.01">
        </div>
        <div class="form-group mb-16">
          <label class="form-label">{{ prefs.t('commonCategory') }}</label>
          <select class="input" v-model="txForm.category">
            <option value="" disabled>{{ prefs.t('financeSelectCategory') }}</option>
            <option v-for="c in formCats" :key="c.name" :value="c.name">{{ c.icon }} {{ c.name }}</option>
          </select>
        </div>
        <div class="form-group mb-16">
          <label class="form-label">{{ prefs.t('commonDate') }}</label>
          <input type="date" class="input" v-model="txForm.date">
        </div>
        <div class="form-group mb-20">
          <label class="form-label">{{ prefs.t('commonNote') }}</label>
          <input class="input" v-model="txForm.note" :placeholder="prefs.t('commonOptional')">
        </div>
        <p v-if="txFormError" class="text-sm" style="color: var(--color-danger); margin-bottom: 12px;">{{ txFormError }}</p>
        <div class="flex gap-12" style="justify-content: flex-end;">
          <button v-if="editingTxId" class="btn btn-danger" @click="deleteTx(editingTxId!); showTxModal = false">{{ prefs.t('commonDelete') }}</button>
          <div style="flex:1;"></div>
          <button class="btn" @click="showTxModal = false">{{ prefs.t('commonCancel') }}</button>
          <button class="btn btn-filled" @click="saveTx">{{ prefs.t('commonSave') }}</button>
        </div>
      </AppModal>

      <!-- Category Management Modal -->
      <AppModal :visible="showCatModal" @close="showCatModal = false">
        <h2 class="heading-md mb-20">{{ prefs.t('financeCategoryManage') }}</h2>
        <div class="flex gap-8 mb-16">
          <button v-for="t in ['income', 'expense']" :key="t" class="btn btn-sm" style="flex:1;"
            :style="{ background: catTab === t ? 'var(--color-ink)' : '', color: catTab === t ? '#fff' : '' }"
            @click="catTab = t">
            {{ t === 'income' ? prefs.t('financeIncomeCategories') : prefs.t('financeExpenseCategories') }}
          </button>
        </div>
        <div>
          <div v-for="cat in catTabList" :key="cat.id" class="category-row">
            <span class="cat-icon">{{ cat.icon }}</span>
            <span class="cat-name">{{ cat.name }}</span>
            <button class="btn btn-sm" @click="editCat(cat)">{{ prefs.t('commonEdit') }}</button>
            <button class="btn btn-sm btn-danger" @click="deleteCat(cat.id)">{{ prefs.t('commonDelete') }}</button>
          </div>
          <EmptyState v-if="catTabList.length === 0" :text="prefs.t('financeNoCategories')" />
        </div>
        <div style="margin-top:16px;padding-top:16px;border-top:var(--border-light);">
          <div class="flex gap-8">
            <input class="input" v-model="newCatIcon" :placeholder="prefs.t('commonIcon')" style="width:60px;text-align:center;">
            <input class="input" v-model="newCatName" :placeholder="prefs.t('financeCategoryName')" style="flex:1;">
            <button class="btn btn-filled btn-sm" @click="addCat">{{ prefs.t('commonAdd') }}</button>
          </div>
        </div>
      </AppModal>

      <!-- Edit Category Modal -->
      <AppModal :visible="showEditCatModal" @close="showEditCatModal = false">
        <h2 class="heading-md mb-20">{{ prefs.t('financeEditCategory') }}</h2>
        <div class="form-group mb-16">
          <label class="form-label">{{ prefs.t('commonIcon') }}</label>
          <input class="input" v-model="editCatForm.icon" style="width:80px;">
        </div>
        <div class="form-group mb-20">
          <label class="form-label">{{ prefs.t('commonName') }}</label>
          <input class="input" v-model="editCatForm.name">
        </div>
        <div class="flex gap-12" style="justify-content: flex-end;">
          <button class="btn" @click="showEditCatModal = false">{{ prefs.t('commonCancel') }}</button>
          <button class="btn btn-filled" @click="saveEditCat">{{ prefs.t('commonSave') }}</button>
        </div>
      </AppModal>

      <!-- Budget Modal -->
      <AppModal :visible="showBudgetModal" @close="showBudgetModal = false">
        <h2 class="heading-md mb-20">{{ prefs.t('financeBudgetSettings') }} · {{ formatMonthLabel(viewYear, viewMonth) }}</h2>
        <div class="form-group mb-16">
          <label class="form-label">{{ prefs.t('financeTotalBudget') }}</label>
          <div class="flex gap-8">
            <input type="number" class="input" v-model.number="budgetTotal" placeholder="0" step="100">
            <button class="btn btn-filled btn-sm" @click="saveBudgetTotal">{{ prefs.t('commonSet') }}</button>
          </div>
        </div>
        <div style="margin-top:16px;padding-top:16px;border-top:var(--border-light);">
          <label class="form-label mb-12">{{ prefs.t('financeCategoryBudget') }}</label>
          <div v-for="b in budgetList" :key="b.id ?? `budget-${b.category ?? 'total'}`" class="flex items-center gap-8 mb-8">
            <span style="font-size:.9rem;min-width:80px;">{{ b.category === TOTAL_BUDGET_CATEGORY ? prefs.t('financeTotalBudget') : b.category }}</span>
            <span class="text-sm" style="flex:1;">{{ fmt(b.amount) }}</span>
            <button v-if="b.id" class="btn btn-sm btn-danger" @click="removeBudget(b.id)">{{ prefs.t('commonDelete') }}</button>
          </div>
          <EmptyState v-if="budgetList.length === 0" :text="prefs.t('financeNoBudget')" />
        </div>
        <div style="margin-top:16px;padding-top:16px;border-top:var(--border-light);">
          <label class="form-label mb-8">{{ prefs.t('financeAddCategoryBudget') }}</label>
          <div class="flex gap-8">
            <select class="input" v-model="newBudgetCat" style="flex:1;">
              <option value="" disabled>{{ prefs.t('financeSelectCategory') }}</option>
              <option v-for="c in expenseCats" :key="c.name" :value="c.name">{{ c.icon }} {{ c.name }}</option>
            </select>
            <input type="number" class="input" v-model.number="newBudgetAmt" :placeholder="prefs.t('commonAmount')" style="width:120px;" step="100">
            <button class="btn btn-filled btn-sm" @click="addBudget">{{ prefs.t('commonAdd') }}</button>
          </div>
        </div>
      </AppModal>
    </main>
  </PasswordGate>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { api } from '../composables/useApi'
import { useAuthStore } from '../stores/auth'
import PasswordGate from '../components/PasswordGate.vue'
import AppModal from '../components/AppModal.vue'
import EmptyState from '../components/EmptyState.vue'
import { PIE_COLORS } from '../constants/chart'
import { usePreferencesStore } from '../stores/preferences'

interface Tx { id: number; type: string; amount: number; category: string; date: string; note: string }
interface Summary { income: number; expense: number; balance: number }
interface Trend { month: string; income: number; expense: number }
interface CatStat { type: string; category: string; total: number; count: number; pct?: number }
interface FinCat { id: number; type: string; name: string; icon: string; sort_order: number }
interface Budget { id: number; month: string; category: string; amount: number }

const TOTAL_BUDGET_CATEGORY = '__total__'

const authStore = useAuthStore()
const prefs = usePreferencesStore()

const FILTERS = computed(() => [
  { key: 'all', label: prefs.t('commonAll') },
  { key: 'income', label: prefs.t('commonIncome') },
  { key: 'expense', label: prefs.t('commonExpense') },
])

// ── View state ───
const now = new Date()
const viewYear = ref(now.getFullYear())
const viewMonth = ref(now.getMonth() + 1)
const yearView = ref(false)
const activeFilter = ref('all')

// ── Data ───
const transactions = ref<Tx[]>([])
const summary = ref<Summary>({ income: 0, expense: 0, balance: 0 })
const trends = ref<Trend[]>([])
const categoryStats = ref<CatStat[]>([])
const categories = ref<FinCat[]>([])
const budgets = ref<Budget[]>([])

// ── Transaction Modal ───
const showTxModal = ref(false)
const editingTxId = ref<number | null>(null)
const txForm = ref({ type: 'expense', amount: 0, category: '', date: '', note: '' })
const txFormError = ref('')

// ── Category Modal ───
const showCatModal = ref(false)
const catTab = ref('expense')
const newCatIcon = ref('📌')
const newCatName = ref('')
const showEditCatModal = ref(false)
const editCatForm = ref({ id: 0, name: '', icon: '' })

// ── Budget Modal ───
const showBudgetModal = ref(false)
const budgetTotal = ref(0)
const newBudgetCat = ref('')
const newBudgetAmt = ref(0)

// ── Computed ───
const isCurrentMonth = computed(() => viewYear.value === now.getFullYear() && viewMonth.value === now.getMonth() + 1 && !yearView.value)
const monthStr = computed(() => `${viewYear.value}-${viewMonth.value.toString().padStart(2, '0')}`)

const filteredTx = computed(() => {
  if (activeFilter.value === 'all') return transactions.value
  return transactions.value.filter(t => t.type === activeFilter.value)
})

const expenseStats = computed(() => categoryStats.value.filter(s => s.type === 'expense'))
const maxVal = computed(() => Math.max(...trends.value.map(t => Math.max(t.income, t.expense)), 1))

const incomeCats = computed(() => categories.value.filter(c => c.type === 'income'))
const expenseCats = computed(() => categories.value.filter(c => c.type === 'expense'))
const formCats = computed(() => txForm.value.type === 'income' ? incomeCats.value : expenseCats.value)
const catTabList = computed(() => categories.value.filter(c => c.type === catTab.value))

const totalBudget = computed(() => {
  const total = budgets.value.find(b => b.category === TOTAL_BUDGET_CATEGORY)
  return total?.amount || 0
})

const budgetList = computed(() => budgets.value)

const pieGradient = computed(() => {
  const stats = expenseStats.value
  if (stats.length === 0) return 'var(--color-tag-bg)'
  let acc = 0
  const stops: string[] = []
  for (let i = 0; i < stats.length; i++) {
    const color = PIE_COLORS[i % PIE_COLORS.length]
    const start = acc
    acc += stats[i].pct || 0
    stops.push(`${color} ${start}% ${acc}%`)
  }
  return `conic-gradient(${stops.join(', ')})`
})

// ── Helpers ───
function barHeight(val: number) { return Math.max(4, (val / maxVal.value) * 100) }
function fmt(n: number) { return '¥' + Number(n || 0).toLocaleString(prefs.language, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }

function catIcon(cat: string) {
  const found = categories.value.find(c => c.name === cat)
  return found?.icon || '📌'
}

function formatYearLabel(year: number) {
  return prefs.tr('commonYearFormat', { year })
}

function formatMonthLabel(year: number, month: number) {
  return prefs.tr('commonMonthFormat', { year, month })
}

// ── Navigation ───
function prevMonth() {
  if (yearView.value) { viewYear.value--; return }
  if (viewMonth.value === 1) { viewMonth.value = 12; viewYear.value-- }
  else { viewMonth.value-- }
}

function nextMonth() {
  if (yearView.value) { viewYear.value++; return }
  if (viewMonth.value === 12) { viewMonth.value = 1; viewYear.value++ }
  else { viewMonth.value++ }
}

function toggleYearView() { yearView.value = !yearView.value }

function goToday() {
  viewYear.value = now.getFullYear()
  viewMonth.value = now.getMonth() + 1
  yearView.value = false
}

function jumpToMonth(m: string) {
  const [y, mo] = m.split('-').map(Number)
  viewYear.value = y
  viewMonth.value = mo
  yearView.value = false
}

// ── Data loading ───
async function loadData() {
  if (!authStore.authed) return
  try {
    const [txData, sumData, trendData, statsData, budgetData] = await Promise.all([
      yearView.value
        ? api<Tx[]>(`/api/finance?year=${viewYear.value}`)
        : api<Tx[]>(`/api/finance?year=${viewYear.value}&month=${viewMonth.value}`),
      yearView.value
        ? api<Summary>(`/api/finance/summary?year=${viewYear.value}&month=0`)
        : api<Summary>(`/api/finance/summary?year=${viewYear.value}&month=${viewMonth.value}`),
      api<Trend[]>('/api/finance/trends'),
      yearView.value
        ? api<CatStat[]>(`/api/finance/category-stats?year=${viewYear.value}&month=0`)
        : api<CatStat[]>(`/api/finance/category-stats?year=${viewYear.value}&month=${viewMonth.value}`),
      api<Budget[]>(`/api/finance/budgets?month=${monthStr.value}`),
    ])
    transactions.value = txData
    summary.value = sumData
    trends.value = trendData
    budgets.value = budgetData

    // Compute pct for expense stats
    const expTotal = statsData.filter(s => s.type === 'expense').reduce((a, b) => a + b.total, 0)
    categoryStats.value = statsData.map(s => ({
      ...s,
      pct: expTotal > 0 && s.type === 'expense' ? Math.round((s.total / expTotal) * 100) : 0,
    }))
  } catch (e) {
    console.error('Failed to load finance data:', e)
  }
}

async function loadCategories() {
  if (!authStore.authed) return
  categories.value = await api<FinCat[]>('/api/finance/categories')
}

async function loadInitialData() {
  if (!authStore.authed) return
  await loadCategories()
  await loadData()
}

// ── Transaction CRUD ───
function openTxModal(tx?: Tx) {
  txFormError.value = ''
  if (tx) {
    editingTxId.value = tx.id
    txForm.value = { type: tx.type, amount: tx.amount, category: tx.category, date: tx.date, note: tx.note || '' }
  } else {
    editingTxId.value = null
    txForm.value = { type: 'expense', amount: 0, category: '', date: new Date().toISOString().split('T')[0], note: '' }
  }
  showTxModal.value = true
}

async function saveTx() {
  txFormError.value = ''
  if (!txForm.value.amount || txForm.value.amount <= 0) { txFormError.value = prefs.t('financeValidAmountRequired'); return }
  if (!txForm.value.category) { txFormError.value = prefs.t('financeCategoryRequired'); return }
  if (editingTxId.value) {
    await api(`/api/finance/${editingTxId.value}`, { method: 'PATCH', body: JSON.stringify(txForm.value) })
  } else {
    await api('/api/finance', { method: 'POST', body: JSON.stringify(txForm.value) })
  }
  showTxModal.value = false
  loadData()
}

async function deleteTx(id: number) {
  await api(`/api/finance/${id}`, { method: 'DELETE' })
  loadData()
}

// ── Category CRUD ───
function openCategoryModal() {
  showCatModal.value = true
}

function editCat(cat: FinCat) {
  editCatForm.value = { id: cat.id, name: cat.name, icon: cat.icon }
  showEditCatModal.value = true
}

async function saveEditCat() {
  if (!editCatForm.value.name) return
  await api(`/api/finance/categories/${editCatForm.value.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: editCatForm.value.name, icon: editCatForm.value.icon }),
  })
  showEditCatModal.value = false
  loadCategories()
}

async function addCat() {
  if (!newCatName.value) return
  await api('/api/finance/categories', {
    method: 'POST',
    body: JSON.stringify({ type: catTab.value, name: newCatName.value, icon: newCatIcon.value || '📌' }),
  })
  newCatName.value = ''
  newCatIcon.value = '📌'
  loadCategories()
}

async function deleteCat(id: number) {
  await api(`/api/finance/categories/${id}`, { method: 'DELETE' })
  loadCategories()
}

// ── Budget CRUD ───
function openBudgetModal() {
  const total = budgets.value.find(b => b.category === TOTAL_BUDGET_CATEGORY)
  budgetTotal.value = total?.amount || 0
  newBudgetCat.value = ''
  newBudgetAmt.value = 0
  showBudgetModal.value = true
}

async function saveBudgetTotal() {
  if (budgetTotal.value <= 0) return
  await api('/api/finance/budgets', {
    method: 'POST',
    body: JSON.stringify({ month: monthStr.value, category: TOTAL_BUDGET_CATEGORY, amount: budgetTotal.value }),
  })
  loadData()
}

async function addBudget() {
  if (!newBudgetCat.value || newBudgetAmt.value <= 0) return
  await api('/api/finance/budgets', {
    method: 'POST',
    body: JSON.stringify({ month: monthStr.value, category: newBudgetCat.value, amount: newBudgetAmt.value }),
  })
  newBudgetCat.value = ''
  newBudgetAmt.value = 0
  loadData()
}

async function removeBudget(id: number) {
  await api(`/api/finance/budgets/${id}`, { method: 'DELETE' })
  loadData()
}

// ── Watchers ───
watch([viewYear, viewMonth, yearView], () => {
  if (authStore.authed) loadData()
})

watch(() => authStore.authed, (authed) => {
  if (authed) loadInitialData()
}, { immediate: true })

onMounted(() => {
  if (!authStore.checked) {
    authStore.check()
  }
})
</script>
