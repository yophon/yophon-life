import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

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

const messages = {
  'zh-CN': {
    appName: 'yophon life',
    navDiary: '日记',
    navTodo: '看板',
    navFinance: '财务',
    navSettings: '设置',
    navLogout: '退出',
    gateLoading: '加载中...',
    gateTitle: '私密空间',
    gateDesc: '需要密码才能访问',
    gatePlaceholder: '输入密码...',
    gateUnlock: '解锁',
    gateError: '密码错误',
    settingsEyebrow: '偏好设置',
    settingsTitle: '系统设置',
    settingsDesc: '切换后立即生效。',
    settingsAppearance: '外观',
    settingsLanguage: '语言',
    settingsTheme: '主题',
    settingsAccent: '强调色',
    settingsDensity: '界面密度',
    settingsMotion: '动效',
    settingsPrivacy: '隐私与会话',
    settingsPrivacyDesc: '管理界面偏好和当前会话。',
    settingsCurrentLanguage: '当前语言',
    settingsThemePreview: '预览',
    settingsReset: '恢复默认',
    settingsLogout: '退出登录',
    settingsPrivacyManage: '管理界面偏好和当前会话。',
    languageChinese: '中文',
    languageEnglish: 'English',
    emptyDefault: '暂无内容',
    commonAdd: '添加',
    commonSave: '保存',
    commonCancel: '取消',
    commonDelete: '删除',
    commonEdit: '编辑',
    commonCreate: '创建',
    commonClear: '清除',
    commonBackThisMonth: '回到本月',
    commonDate: '日期',
    commonType: '类型',
    commonAmount: '金额',
    commonCategory: '分类',
    commonName: '名称',
    commonIcon: '图标',
    commonNote: '备注',
    commonOptional: '可选',
    commonSet: '设置',
    commonIncome: '收入',
    commonExpense: '支出',
    commonBudget: '预算',
    commonSpent: '已花',
    commonAll: '全部',
    commonHigh: '高',
    commonMedium: '中',
    commonLow: '低',
    commonMonthUnit: '月',
    commonArticleUnit: '篇',
    commonYearFormat: '{year}年',
    commonMonthFormat: '{year}年{month}月',
    commonSearchResult: '搜索 “{query}” 找到 {count} 条结果',
    commonDeleteIrreversible: '此操作不可撤销。',
    diaryTitle: '日记本',
    diaryWrite: '写日记',
    diaryEdit: '编辑日记',
    diaryCalendar: '日历',
    diaryPickMonth: '选择月份',
    diaryPrevYear: '上一年',
    diaryNextYear: '下一年',
    diaryMoodTrend: '统计',
    diarySearchPlaceholder: '搜索日记...',
    diaryEmptyMonth: '本月暂无日记',
    diaryMonthCount: '本月日记',
    diaryTopMood: '最常心情',
    diaryTopTags: '热门标签',
    diaryFilter: '筛选',
    diaryUnwritten: '未写日记',
    diaryLinkedOnly: '这一天还没有日记，但有看板或财务记录。',
    diaryLinkedFinance: '财务记录',
    diaryLinkedKanban: '看板变动',
    diaryEmptyList: '这个月还没有日记或联动记录',
    diaryMood: '心情',
    diaryContent: '内容',
    diaryTags: '标签',
    diaryContentPlaceholder: '今天怎么样？',
    diaryTagsPlaceholder: '用逗号分隔，如: 阅读, 运动',
    diaryNeedDateContent: '请填写日期和内容',
    diaryNeedMood: '请选择心情',
    diaryDeleteConfirm: '确定删除这篇日记吗？',
    moodHappy: '开心',
    moodCalm: '平静',
    moodSad: '难过',
    moodAngry: '生气',
    moodThinking: '思考',
    moodTired: '疲惫',
    moodExcited: '兴奋',
    moodProductive: '充实',
    weekdayMon: '一',
    weekdayTue: '二',
    weekdayWed: '三',
    weekdayThu: '四',
    weekdayFri: '五',
    weekdaySat: '六',
    weekdaySun: '日',
    activityCreate: '新建',
    activityUpdate: '编辑',
    activityDelete: '删除',
    activityMove: '移动',
    activityBoard: '看板',
    activityColumn: '栏',
    activityTodo: '任务',
    financeTitle: '财务',
    financeCategoryManage: '分类管理',
    financeBudgetSettings: '预算设置',
    financeAddTransaction: '记一笔',
    financeYearIncome: '年度收入',
    financeMonthIncome: '本月收入',
    financeYearExpense: '年度支出',
    financeMonthExpense: '本月支出',
    financeYearBalance: '年度结余',
    financeMonthBalance: '本月结余',
    financeMonthlyTrend: '月度趋势',
    financeExpenseCategory: '支出分类',
    financeNoExpenseData: '暂无支出数据',
    financeTransactionRecords: '交易记录',
    financeNoRecords: '暂无记录',
    financeEditTransaction: '编辑交易',
    financeSelectCategory: '选择分类',
    financeIncomeCategories: '收入分类',
    financeExpenseCategories: '支出分类',
    financeNoCategories: '暂无分类',
    financeCategoryName: '分类名称',
    financeEditCategory: '编辑分类',
    financeTotalBudget: '总预算',
    financeCategoryBudget: '分类预算',
    financeNoBudget: '暂无预算',
    financeAddCategoryBudget: '添加分类预算',
    financeValidAmountRequired: '请输入有效金额',
    financeCategoryRequired: '请选择分类',
    todoTitle: '看板',
    todoAddBoard: '看板',
    todoAddColumn: '新栏',
    todoAddTask: '新任务',
    todoEditTask: '编辑任务',
    todoTaskId: '任务 ID',
    todoTaskName: '任务名称',
    todoTaskPlaceholder: '做什么？',
    todoDescription: '描述',
    todoPriority: '优先级',
    todoColumn: '栏',
    todoNewBoard: '新看板',
    todoBoardName: '看板名称',
    todoBoardNamePlaceholder: '输入看板名称',
    todoNewColumn: '新栏',
    todoColumnName: '栏名称',
    todoColumnNamePlaceholder: '输入栏名称',
    todoDeleteBoard: '删除看板',
    todoDeleteBoardConfirm: '确定删除此看板及其所有任务？',
    todoDeleteColumn: '删除栏',
    todoDeleteColumnConfirm: '确定删除「{name}」栏',
    todoDeleteColumnTasks: '及其中 {count} 个任务',
    todoExpandColumn: '展开栏',
    todoCollapseColumn: '折叠栏',
    todoResizeColumnWidth: '调整栏宽度',
    todoResizeColumnHeight: '调整栏高度',
    todoResizeColumnBoth: '调整栏宽度和高度',
    optionSystem: '跟随系统',
    optionLight: '浅色',
    optionDark: '深色',
    optionForest: '森林绿',
    optionBlue: '海湾蓝',
    optionRose: '莓果红',
    optionComfortable: '舒适',
    optionCompact: '紧凑',
    optionFullMotion: '完整动效',
    optionReducedMotion: '减少动效',
    notFoundTitle: '页面不存在',
    notFoundDesc: '你访问的页面可能已经被移除或从未存在。',
    notFoundBack: '回到日记',
  },
  'en-US': {
    appName: 'yophon life',
    navDiary: 'Diary',
    navTodo: 'Board',
    navFinance: 'Finance',
    navSettings: 'Settings',
    navLogout: 'Log out',
    gateLoading: 'Loading...',
    gateTitle: 'Private Space',
    gateDesc: 'Enter the password to continue',
    gatePlaceholder: 'Password...',
    gateUnlock: 'Unlock',
    gateError: 'Incorrect password',
    settingsEyebrow: 'Preferences',
    settingsTitle: 'Settings',
    settingsDesc: 'Changes take effect immediately.',
    settingsAppearance: 'Appearance',
    settingsLanguage: 'Language',
    settingsTheme: 'Theme',
    settingsAccent: 'Accent',
    settingsDensity: 'Density',
    settingsMotion: 'Motion',
    settingsPrivacy: 'Privacy & Session',
    settingsPrivacyDesc: 'Manage interface preferences and the current session.',
    settingsCurrentLanguage: 'Current language',
    settingsThemePreview: 'Preview',
    settingsReset: 'Reset defaults',
    settingsLogout: 'Log out',
    settingsPrivacyManage: 'Manage interface preferences and the current session.',
    languageChinese: '中文',
    languageEnglish: 'English',
    emptyDefault: 'No content',
    commonAdd: 'Add',
    commonSave: 'Save',
    commonCancel: 'Cancel',
    commonDelete: 'Delete',
    commonEdit: 'Edit',
    commonCreate: 'Create',
    commonClear: 'Clear',
    commonBackThisMonth: 'Back to this month',
    commonDate: 'Date',
    commonType: 'Type',
    commonAmount: 'Amount',
    commonCategory: 'Category',
    commonName: 'Name',
    commonIcon: 'Icon',
    commonNote: 'Note',
    commonOptional: 'Optional',
    commonSet: 'Set',
    commonIncome: 'Income',
    commonExpense: 'Expense',
    commonBudget: 'Budget',
    commonSpent: 'Spent',
    commonAll: 'All',
    commonHigh: 'High',
    commonMedium: 'Medium',
    commonLow: 'Low',
    commonMonthUnit: 'mo',
    commonArticleUnit: 'entries',
    commonYearFormat: '{year}',
    commonMonthFormat: '{month}/{year}',
    commonSearchResult: 'Search “{query}” found {count} results',
    commonDeleteIrreversible: 'This cannot be undone.',
    diaryTitle: 'Diary',
    diaryWrite: 'Write',
    diaryEdit: 'Edit Entry',
    diaryCalendar: 'Calendar',
    diaryPickMonth: 'Pick month',
    diaryPrevYear: 'Previous year',
    diaryNextYear: 'Next year',
    diaryMoodTrend: 'Stats',
    diarySearchPlaceholder: 'Search diary...',
    diaryEmptyMonth: 'No diary entries this month',
    diaryMonthCount: 'Monthly entries',
    diaryTopMood: 'Top mood',
    diaryTopTags: 'Top tags',
    diaryFilter: 'Filter',
    diaryUnwritten: 'No diary',
    diaryLinkedOnly: 'No diary entry yet, but this day has board or finance records.',
    diaryLinkedFinance: 'Finance Records',
    diaryLinkedKanban: 'Board Activity',
    diaryEmptyList: 'No diary entries or linked records this month',
    diaryMood: 'Mood',
    diaryContent: 'Content',
    diaryTags: 'Tags',
    diaryContentPlaceholder: 'How was today?',
    diaryTagsPlaceholder: 'Separate tags with commas, e.g. reading, workout',
    diaryNeedDateContent: 'Fill in date and content',
    diaryNeedMood: 'Choose a mood',
    diaryDeleteConfirm: 'Delete this diary entry?',
    moodHappy: 'Happy',
    moodCalm: 'Calm',
    moodSad: 'Sad',
    moodAngry: 'Angry',
    moodThinking: 'Thinking',
    moodTired: 'Tired',
    moodExcited: 'Excited',
    moodProductive: 'Productive',
    weekdayMon: 'Mon',
    weekdayTue: 'Tue',
    weekdayWed: 'Wed',
    weekdayThu: 'Thu',
    weekdayFri: 'Fri',
    weekdaySat: 'Sat',
    weekdaySun: 'Sun',
    activityCreate: 'Created ',
    activityUpdate: 'Updated ',
    activityDelete: 'Deleted ',
    activityMove: 'Moved ',
    activityBoard: 'board',
    activityColumn: 'column',
    activityTodo: 'task',
    financeTitle: 'Finance',
    financeCategoryManage: 'Categories',
    financeBudgetSettings: 'Budgets',
    financeAddTransaction: 'Add Record',
    financeYearIncome: 'Year Income',
    financeMonthIncome: 'Month Income',
    financeYearExpense: 'Year Expense',
    financeMonthExpense: 'Month Expense',
    financeYearBalance: 'Year Balance',
    financeMonthBalance: 'Month Balance',
    financeMonthlyTrend: 'Monthly Trend',
    financeExpenseCategory: 'Expense Categories',
    financeNoExpenseData: 'No expense data',
    financeTransactionRecords: 'Transactions',
    financeNoRecords: 'No records',
    financeEditTransaction: 'Edit Transaction',
    financeSelectCategory: 'Select category',
    financeIncomeCategories: 'Income categories',
    financeExpenseCategories: 'Expense categories',
    financeNoCategories: 'No categories',
    financeCategoryName: 'Category name',
    financeEditCategory: 'Edit Category',
    financeTotalBudget: 'Total budget',
    financeCategoryBudget: 'Category budgets',
    financeNoBudget: 'No budgets',
    financeAddCategoryBudget: 'Add category budget',
    financeValidAmountRequired: 'Enter a valid amount',
    financeCategoryRequired: 'Choose a category',
    todoTitle: 'Board',
    todoAddBoard: 'Board',
    todoAddColumn: 'Column',
    todoAddTask: 'Task',
    todoEditTask: 'Edit Task',
    todoTaskId: 'Task ID',
    todoTaskName: 'Task name',
    todoTaskPlaceholder: 'What needs doing?',
    todoDescription: 'Description',
    todoPriority: 'Priority',
    todoColumn: 'Column',
    todoNewBoard: 'New Board',
    todoBoardName: 'Board name',
    todoBoardNamePlaceholder: 'Enter board name',
    todoNewColumn: 'New Column',
    todoColumnName: 'Column name',
    todoColumnNamePlaceholder: 'Enter column name',
    todoDeleteBoard: 'Delete Board',
    todoDeleteBoardConfirm: 'Delete this board and all its tasks?',
    todoDeleteColumn: 'Delete Column',
    todoDeleteColumnConfirm: 'Delete column “{name}”',
    todoDeleteColumnTasks: ' and its {count} tasks',
    todoExpandColumn: 'Expand column',
    todoCollapseColumn: 'Collapse column',
    todoResizeColumnWidth: 'Resize column width',
    todoResizeColumnHeight: 'Resize column height',
    todoResizeColumnBoth: 'Resize column width and height',
    optionSystem: 'System',
    optionLight: 'Light',
    optionDark: 'Dark',
    optionForest: 'Forest',
    optionBlue: 'Bay blue',
    optionRose: 'Berry',
    optionComfortable: 'Comfortable',
    optionCompact: 'Compact',
    optionFullMotion: 'Full motion',
    optionReducedMotion: 'Reduced motion',
    notFoundTitle: 'Page not found',
    notFoundDesc: 'The page you opened may have been removed or never existed.',
    notFoundBack: 'Back to diary',
  },
} as const

export type MessageKey = keyof typeof messages['zh-CN']

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
