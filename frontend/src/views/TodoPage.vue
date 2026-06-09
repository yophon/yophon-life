<template>
  <PasswordGate>
    <main class="todo-page">
      <!-- Header -->
      <section class="board-toolbar-section">
        <div class="board-toolbar fade-up">
          <div class="board-tabs" aria-label="Boards">
            <div
              v-for="board in boards" :key="board.id"
              class="board-tab"
              :class="{
                active: currentBoardId === board.id,
                dragging: boardDragState.active && boardDragState.id === board.id,
                'drop-before': boardDragState.active && boardDragState.targetId === board.id && boardDragState.insertBefore,
                'drop-after': boardDragState.active && boardDragState.targetId === board.id && !boardDragState.insertBefore,
              }"
              :data-board-id="board.id"
              @pointerdown="onBoardPointerDown(board, $event)"
              @click="switchBoard(board.id)"
              @dblclick="startEditBoard(board)">
              <span v-if="editingBoardId !== board.id">{{ board.name }}</span>
              <input
                v-else
                ref="boardEditInputs"
                class="board-tab-input"
                v-model="editingBoardName"
                @blur="finishEditBoard"
                @keydown.enter="finishEditBoard"
                @keydown.escape="editingBoardId = null">
              <span
                v-if="boards.length > 1 && editingBoardId !== board.id"
                class="board-tab-delete"
                @click.stop="showDeleteBoardModal = board.id">✕</span>
            </div>
          </div>
          <div class="board-actions">
            <button class="btn btn-sm" @click="openActivityModal">{{ prefs.t('todoHistory') }}</button>
            <button class="btn btn-sm" @click="showBoardModal = true">+ {{ prefs.t('todoAddBoard') }}</button>
            <button class="btn btn-sm" @click="showColModal = true">+ {{ prefs.t('todoAddColumn') }}</button>
            <button class="btn btn-sm btn-filled" @click="() => openNewTodo()">+ {{ prefs.t('todoAddTask') }}</button>
          </div>
          <p v-if="boardError" class="board-error" role="alert">{{ boardError }}</p>
        </div>
      </section>

      <!-- Kanban -->
      <section class="section kanban-section">
        <div class="kanban-viewport" ref="kanbanViewportRef" @wheel="onKanbanWheel">
          <div class="kanban" ref="kanbanRef"
            :class="{ 'column-dragging': columnDragState.active }">
            <template v-for="row in columnRows" :key="row.rowIndex">
              <div class="kanban-row" :data-row-index="row.rowIndex">
                <div v-for="col in row.columns" :key="col.id"
                  class="kanban-col"
                  :class="{
                    collapsed: isColCollapsed(col),
                    dragging: columnDragState.active && columnDragState.id === col.id,
                    'drop-before': columnDragState.active && columnDragState.targetColId === col.id && columnDragState.insertBefore,
                    'drop-after': columnDragState.active && columnDragState.targetColId === col.id && !columnDragState.insertBefore,
                  }"
                  :data-col-id="col.id"
                  :data-row-index="row.rowIndex"
                  :style="columnStyle(col)">
                  <div class="kanban-col-header" @pointerdown="onColumnPointerDown(col, $event)" @click="onColumnHeaderClick(col)">
                    <div class="kanban-col-label">
                      <span class="kanban-col-count">{{ itemsByCol(col.id).length }}</span>
                      <h3 v-if="editingColId !== col.id" class="kanban-col-title" @dblclick="startEditCol(col)">
                        {{ col.name }}
                      </h3>
                      <input
                        v-else
                        ref="colEditInputs"
                        class="col-edit-input"
                        v-model="editingColName"
                        @blur="finishEditCol"
                        @keydown.enter="finishEditCol"
                        @keydown.escape="editingColId = null">
                    </div>
                    <div class="kanban-col-tools">
                      <button
                        class="kanban-col-tool"
                        type="button"
                        :title="isColCollapsed(col) ? prefs.t('todoExpandColumn') : prefs.t('todoCollapseColumn')"
                        @pointerdown.stop
                        @click.stop="toggleColumnCollapsed(col)">
                        {{ isColCollapsed(col) ? '⌄' : '⌃' }}
                      </button>
                      <button
                        v-if="columns.length > 1"
                        class="kanban-col-tool kanban-col-delete"
                        type="button"
                        :title="prefs.t('todoDeleteColumn')"
                        @pointerdown.stop
                        @click.stop="showDeleteColModal = col.id">✕</button>
                    </div>
                  </div>
                  <div class="kanban-cards"
                    v-show="!isColCollapsed(col)"
                    :data-col-id="col.id"
                    :class="{ 'drag-over': dragState.active && dragState.targetColId === col.id }">
                    <template v-for="(item, idx) in itemsByCol(col.id)" :key="item.id">
                      <div
                        v-if="dragState.active && dragState.targetColId === col.id && dragState.insertIndex === idx"
                        class="kanban-drop-placeholder"></div>
                      <div
                        class="kanban-card"
                        :class="{ dragging: dragState.id === item.id }"
                        :data-id="item.id"
                        @pointerdown="onPointerDown(item, $event)"
                        @click="onCardClick(item)">
                        <span class="kanban-card-id">#{{ item.id }}</span>
                        <div class="kanban-card-title">{{ item.title }}</div>
                        <p v-if="item.description" class="kanban-card-desc">{{ item.description }}</p>
                        <div class="kanban-card-meta">
                          <span class="kanban-priority" :class="item.priority"></span>
                          <span class="text-xs">{{ priorityLabel(item.priority) }}</span>
                          <span class="kanban-card-delete" @pointerdown.stop @click.stop="askDeleteTodo(item)">✕</span>
                        </div>
                      </div>
                    </template>
                    <div
                      v-if="dragState.active && dragState.targetColId === col.id && dragState.insertIndex >= itemsByCol(col.id).length"
                      class="kanban-drop-placeholder"></div>
                    <button
                      class="kanban-add-card"
                      type="button"
                      :title="prefs.t('todoAddTask')"
                      @pointerdown.stop
                      @click.stop="openNewTodo(col.id)">
                      +
                    </button>
                  </div>
                  <button
                    class="kanban-resize-handle kanban-resize-handle-x"
                    type="button"
                    :title="prefs.t('todoResizeColumnWidth')"
                    @pointerdown.stop.prevent="onColumnResizePointerDown(col, $event)"></button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </section>

      <!-- Ghost -->
      <div v-if="dragState.active" class="kanban-ghost" :style="ghostStyle">
        <div class="kanban-card-title">{{ dragState.title }}</div>
      </div>

      <!-- Task Modal (create & edit) -->
      <AppModal :visible="showTaskModal" @close="closeTaskModal">
        <h2 class="heading-md mb-20">{{ editingTodoId ? prefs.t('todoEditTask') : prefs.t('todoAddTask') }}</h2>
        <div v-if="editingTodoId" class="task-id-row mb-16">
          <span>{{ prefs.t('todoTaskId') }}</span>
          <code>#{{ editingTodoId }}</code>
        </div>
        <div class="form-group mb-16">
          <label class="form-label">{{ prefs.t('todoTaskName') }}</label>
          <input class="input" v-model="taskForm.title" :placeholder="prefs.t('todoTaskPlaceholder')">
        </div>
        <div class="form-group mb-16">
          <label class="form-label">{{ prefs.t('todoDescription') }}</label>
          <textarea class="input" v-model="taskForm.description" rows="2" :placeholder="prefs.t('commonOptional')" style="min-height: 60px;"></textarea>
        </div>
        <div class="form-group mb-16">
          <label class="form-label">{{ prefs.t('todoPriority') }}</label>
          <select class="input" v-model="taskForm.priority">
            <option value="high">{{ prefs.t('commonHigh') }}</option>
            <option value="medium">{{ prefs.t('commonMedium') }}</option>
            <option value="low">{{ prefs.t('commonLow') }}</option>
          </select>
        </div>
        <div class="form-group mb-20">
          <label class="form-label">{{ prefs.t('todoColumn') }}</label>
          <select class="input" v-model="taskForm.column_id">
            <option v-for="col in columns" :key="col.id" :value="col.id">{{ col.name }}</option>
          </select>
        </div>
        <div v-if="editingTodoId" class="task-comments mb-20">
          <div class="task-comments-header">
            <h3>{{ prefs.t('todoComments') }}</h3>
            <span class="text-xs">{{ comments.length }}</span>
          </div>
          <div class="task-comment-list">
            <p v-if="commentsLoading" class="task-comment-empty">{{ prefs.t('commonLoading') }}</p>
            <p v-else-if="!comments.length" class="task-comment-empty">{{ prefs.t('todoNoComments') }}</p>
            <article v-for="comment in comments" v-else :key="comment.id" class="task-comment">
              <p>{{ comment.content }}</p>
              <div class="task-comment-meta">
                <time :datetime="commentDateTime(comment.created_at)">{{ formatCommentTime(comment.created_at) }}</time>
                <button class="task-comment-delete" type="button" :disabled="pendingAction === `deleteComment:${comment.id}`" @click="deleteComment(comment)">
                  {{ prefs.t('commonDelete') }}
                </button>
              </div>
            </article>
          </div>
          <div class="task-comment-form">
            <textarea
              class="input"
              v-model="commentDraft"
              rows="2"
              maxlength="2000"
              :placeholder="prefs.t('todoCommentPlaceholder')"
              @keydown.meta.enter.prevent="addComment"
              @keydown.ctrl.enter.prevent="addComment"></textarea>
            <button class="btn btn-sm btn-filled" type="button" :disabled="pendingAction === 'addComment' || !commentDraft.trim()" @click="addComment">
              {{ prefs.t('todoAddComment') }}
            </button>
          </div>
        </div>
        <div class="flex gap-12" style="justify-content: flex-end;">
          <button class="btn" @click="closeTaskModal">{{ prefs.t('commonCancel') }}</button>
          <button class="btn btn-filled" :disabled="pendingAction === 'saveTodo'" @click="editingTodoId ? saveEditTodo() : addTodo()">
            {{ editingTodoId ? prefs.t('commonSave') : prefs.t('commonAdd') }}
          </button>
        </div>
      </AppModal>

      <!-- New Board Modal -->
      <AppModal :visible="showBoardModal" @close="showBoardModal = false">
        <h2 class="heading-md mb-20">{{ prefs.t('todoNewBoard') }}</h2>
        <div class="form-group mb-20">
          <label class="form-label">{{ prefs.t('todoBoardName') }}</label>
          <input class="input" v-model="boardFormName" :placeholder="prefs.t('todoBoardNamePlaceholder')" @keydown.enter="addBoard">
        </div>
        <div class="flex gap-12" style="justify-content: flex-end;">
          <button class="btn" @click="showBoardModal = false">{{ prefs.t('commonCancel') }}</button>
          <button class="btn btn-filled" :disabled="pendingAction === 'addBoard'" @click="addBoard">{{ prefs.t('commonCreate') }}</button>
        </div>
      </AppModal>

      <!-- New Column Modal -->
      <AppModal :visible="showColModal" @close="showColModal = false">
        <h2 class="heading-md mb-20">{{ prefs.t('todoNewColumn') }}</h2>
        <div class="form-group mb-20">
          <label class="form-label">{{ prefs.t('todoColumnName') }}</label>
          <input class="input" v-model="colFormName" :placeholder="prefs.t('todoColumnNamePlaceholder')" @keydown.enter="addColumn">
        </div>
        <div class="flex gap-12" style="justify-content: flex-end;">
          <button class="btn" @click="showColModal = false">{{ prefs.t('commonCancel') }}</button>
          <button class="btn btn-filled" :disabled="pendingAction === 'addColumn'" @click="addColumn">{{ prefs.t('commonCreate') }}</button>
        </div>
      </AppModal>

      <!-- Activity History Modal -->
      <AppModal :visible="showActivityModal" @close="showActivityModal = false">
        <div class="history-modal">
          <div class="history-header">
            <h2 class="heading-md">{{ prefs.t('todoHistoryTitle') }}</h2>
            <button class="btn btn-sm" type="button" :disabled="activityLoading" @click="loadActivity">
              {{ prefs.t('todoHistoryRefresh') }}
            </button>
          </div>
          <div class="history-filters">
            <label class="history-filter">
              <span>{{ prefs.t('todoHistoryEntity') }}</span>
              <select class="input" v-model="activityFilters.entity">
                <option value="all">{{ prefs.t('todoHistoryAllEntities') }}</option>
                <option value="board">{{ prefs.t('activityBoard') }}</option>
                <option value="column">{{ prefs.t('activityColumn') }}</option>
                <option value="todo">{{ prefs.t('activityTodo') }}</option>
              </select>
            </label>
            <label class="history-filter">
              <span>{{ prefs.t('todoHistoryAction') }}</span>
              <select class="input" v-model="activityFilters.action">
                <option value="all">{{ prefs.t('todoHistoryAllActions') }}</option>
                <option value="create">{{ prefs.t('activityCreate') }}</option>
                <option value="update">{{ prefs.t('activityUpdate') }}</option>
                <option value="move">{{ prefs.t('activityMove') }}</option>
                <option value="delete">{{ prefs.t('activityDelete') }}</option>
              </select>
            </label>
            <label class="history-filter history-filter-search">
              <span>{{ prefs.t('todoHistorySearch') }}</span>
              <input
                class="input"
                v-model="activityFilters.q"
                :placeholder="prefs.t('todoHistorySearchPlaceholder')"
                @keydown.enter="loadActivity">
            </label>
            <button class="btn btn-filled btn-sm" type="button" :disabled="activityLoading" @click="loadActivity">
              {{ prefs.t('commonSearch') }}
            </button>
          </div>
          <div class="history-list">
            <p v-if="activityLoading" class="history-empty">{{ prefs.t('commonLoading') }}</p>
            <p v-else-if="!activityItems.length" class="history-empty">{{ prefs.t('todoHistoryEmpty') }}</p>
            <article v-for="activity in activityItems" v-else :key="activity.id" class="history-item">
              <div class="history-item-main">
                <span class="history-badge">{{ activityLabel(activity) }}</span>
                <strong>{{ activity.entity_title }}</strong>
              </div>
              <p v-if="activity.details" class="history-details">{{ activity.details }}</p>
              <div class="history-meta">
                <time :datetime="activityDateTime(activity.created_at)">{{ formatActivityTime(activity.created_at) }}</time>
                <span v-if="activity.board_name">「{{ activity.board_name }}」</span>
                <span>#{{ activity.entity_id }}</span>
              </div>
            </article>
          </div>
        </div>
      </AppModal>

      <!-- Delete Board Confirm Modal -->
      <AppModal :visible="showDeleteBoardModal !== null" @close="showDeleteBoardModal = null">
        <h2 class="heading-md mb-12">{{ prefs.t('todoDeleteBoard') }}</h2>
        <p class="text-body mb-20">{{ prefs.t('todoDeleteBoardConfirm') }} {{ prefs.t('commonDeleteIrreversible') }}</p>
        <div class="flex gap-12" style="justify-content: flex-end;">
          <button class="btn" @click="showDeleteBoardModal = null">{{ prefs.t('commonCancel') }}</button>
          <button class="btn btn-danger-filled" :disabled="pendingAction === 'deleteBoard'" @click="doDeleteBoard">{{ prefs.t('commonDelete') }}</button>
        </div>
      </AppModal>

      <!-- Delete Column Confirm Modal -->
      <AppModal :visible="showDeleteColModal !== null" @close="showDeleteColModal = null">
        <h2 class="heading-md mb-12">{{ prefs.t('todoDeleteColumn') }}</h2>
        <p class="text-body mb-20">
          {{ prefs.tr('todoDeleteColumnConfirm', { name: deleteColName }) }}<template v-if="deleteColCount > 0">{{ prefs.tr('todoDeleteColumnTasks', { count: deleteColCount }) }}</template>? {{ prefs.t('commonDeleteIrreversible') }}
        </p>
        <div class="flex gap-12" style="justify-content: flex-end;">
          <button class="btn" @click="showDeleteColModal = null">{{ prefs.t('commonCancel') }}</button>
          <button class="btn btn-danger-filled" :disabled="pendingAction === 'deleteColumn'" @click="doDeleteCol">{{ prefs.t('commonDelete') }}</button>
        </div>
      </AppModal>

      <!-- Delete Task Confirm Modal -->
      <AppModal :visible="todoPendingDelete !== null" @close="todoPendingDelete = null">
        <h2 class="heading-md mb-12">{{ prefs.t('todoDeleteTask') }}</h2>
        <p class="text-body mb-20">{{ prefs.tr('todoDeleteTaskConfirm', { title: todoPendingDelete?.title || '' }) }} {{ prefs.t('commonDeleteIrreversible') }}</p>
        <div class="flex gap-12" style="justify-content: flex-end;">
          <button class="btn" @click="todoPendingDelete = null">{{ prefs.t('commonCancel') }}</button>
          <button class="btn btn-danger-filled" :disabled="pendingAction === 'deleteTodo'" @click="doDeleteTodo">{{ prefs.t('commonDelete') }}</button>
        </div>
      </AppModal>
    </main>
  </PasswordGate>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { api } from '../composables/useApi'
import { useAuthStore } from '../stores/auth'
import PasswordGate from '../components/PasswordGate.vue'
import AppModal from '../components/AppModal.vue'
import { usePreferencesStore } from '../stores/preferences'

interface TodoItem {
  id: number; title: string; description: string
  priority: string; status: string
  board_id: number; column_id: number; sort_order: number
}
interface TodoComment {
  id: number
  todo_id: number
  content: string
  created_at: number
  updated_at: number
}
interface Board { id: number; name: string; sort_order: number }
interface Column {
  id: number
  board_id: number
  name: string
  sort_order: number
  row_index?: number
  collapsed?: number
  width?: number | null
}
interface KanbanActivity {
  id: number
  action: 'create' | 'update' | 'delete' | 'move'
  entity_type: 'board' | 'column' | 'todo'
  entity_id: number | null
  entity_title: string
  board_id: number | null
  board_name: string
  details: string
  created_at: number
}

const authStore = useAuthStore()
const prefs = usePreferencesStore()

// ── State ──
const boards = ref<Board[]>([])
const columns = ref<Column[]>([])
const todos = ref<TodoItem[]>([])
const currentBoardId = ref<number>(0)
const kanbanRef = ref<HTMLElement | null>(null)
const kanbanViewportRef = ref<HTMLElement | null>(null)

// Modals
const showTaskModal = ref(false)
const showBoardModal = ref(false)
const showColModal = ref(false)
const showDeleteBoardModal = ref<number | null>(null)
const showDeleteColModal = ref<number | null>(null)
const todoPendingDelete = ref<TodoItem | null>(null)
const boardError = ref('')
const pendingAction = ref('')

// Forms
const taskForm = ref({ title: '', description: '', priority: 'medium', column_id: 0 })
const boardFormName = ref('')
const colFormName = ref('')
const editingTodoId = ref<number | null>(null)
const comments = ref<TodoComment[]>([])
const commentDraft = ref('')
const commentsLoading = ref(false)
const showActivityModal = ref(false)
const activityItems = ref<KanbanActivity[]>([])
const activityLoading = ref(false)
const activityFilters = reactive({
  entity: 'all',
  action: 'all',
  q: '',
})

// Board editing
const editingBoardId = ref<number | null>(null)
const editingBoardName = ref('')
const boardEditInputs = ref<HTMLInputElement[]>([])

// Column editing
const editingColId = ref<number | null>(null)
const editingColName = ref('')
const colEditInputs = ref<HTMLInputElement[]>([])

// Delete column computed
const deleteColName = computed(() => {
  if (!showDeleteColModal.value) return ''
  return columns.value.find(c => c.id === showDeleteColModal.value)?.name || ''
})
const deleteColCount = computed(() => {
  if (!showDeleteColModal.value) return 0
  return itemsByCol(showDeleteColModal.value).length
})

// ── Drag state ──
const DRAG_THRESHOLD = 5
const LONG_PRESS_DELAY_MS = 550
const LONG_PRESS_MOVE_TOLERANCE = 10
type LongPressMode = 'idle' | 'waiting' | 'ready' | 'cancelled'
type LongPressDrag = {
  timer: number | null
  pointerId: number | null
  startX: number
  startY: number
  required: boolean
  mode: LongPressMode
}
function createLongPressDrag(): LongPressDrag {
  return {
    timer: null,
    pointerId: null,
    startX: 0,
    startY: 0,
    required: false,
    mode: 'idle',
  }
}

const dragState = reactive({
  active: false,
  id: null as number | null,
  title: '',
  originColId: 0,
  targetColId: 0,
  insertIndex: -1,
  x: 0, y: 0,
  offsetX: 0, offsetY: 0,
  cardWidth: 0,
})
let pointerStart = { x: 0, y: 0, id: 0, title: '', colId: 0, width: 0 }
let hasMoved = false
const cardLongPress = createLongPressDrag()

const columnDragState = reactive({
  active: false,
  id: null as number | null,
  targetColId: null as number | null,
  targetRowIndex: 0,
  insertBefore: false,
})
let columnPointerStart = { x: 0, y: 0, id: 0 }
let columnHasMoved = false
const columnLongPress = createLongPressDrag()

const columnResizeState = reactive({
  active: false,
  id: null as number | null,
  startX: 0,
  startWidth: 0,
})

const boardDragState = reactive({
  active: false,
  id: null as number | null,
  targetId: null as number | null,
  insertBefore: false,
})
let boardPointerStart = { x: 0, y: 0, id: 0 }
let boardHasMoved = false
const boardLongPress = createLongPressDrag()

const ghostStyle = computed(() => ({
  position: 'fixed' as const,
  left: `${dragState.x - dragState.offsetX}px`,
  top: `${dragState.y - dragState.offsetY}px`,
  width: `${dragState.cardWidth}px`,
  pointerEvents: 'none' as const,
  zIndex: 9999,
}))

// ── Helpers ──
function shouldRequireLongPress(e: PointerEvent) {
  if (e.pointerType === 'touch' || e.pointerType === 'pen') return true
  return window.matchMedia?.('(pointer: coarse)').matches ?? false
}

function beginLongPressDrag(state: LongPressDrag, e: PointerEvent) {
  resetLongPressDrag(state)
  state.required = shouldRequireLongPress(e)
  if (!state.required) return

  state.pointerId = e.pointerId
  state.startX = e.clientX
  state.startY = e.clientY
  state.mode = 'waiting'
  state.timer = window.setTimeout(() => {
    state.timer = null
    if (state.mode !== 'waiting') return
    state.mode = 'ready'
  }, LONG_PRESS_DELAY_MS)
}

function resetLongPressDrag(state: LongPressDrag) {
  if (state.timer) window.clearTimeout(state.timer)
  state.timer = null
  state.pointerId = null
  state.required = false
  state.mode = 'idle'
}

function longPressBlocksDrag(state: LongPressDrag, e: PointerEvent) {
  if (!state.required) return false
  if (state.pointerId !== e.pointerId) return true
  if (state.mode === 'cancelled') return true
  if (state.mode !== 'waiting') return false

  const dx = e.clientX - state.startX
  const dy = e.clientY - state.startY
  if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE) {
    if (state.timer) window.clearTimeout(state.timer)
    state.timer = null
    state.mode = 'cancelled'
  }
  return true
}

function itemsByCol(colId: number): TodoItem[] {
  return itemsByColumn.value.get(colId) || []
}

const itemsByColumn = computed(() => {
  const map = new Map<number, TodoItem[]>()
  for (const item of todos.value) {
    if (!map.has(item.column_id)) map.set(item.column_id, [])
    map.get(item.column_id)!.push(item)
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
  }
  return map
})

function showError(message?: string) {
  boardError.value = message || prefs.t('todoActionFailed')
}

function clearError() {
  boardError.value = ''
}

async function runPending(action: string, fn: () => Promise<void>) {
  if (pendingAction.value) return
  pendingAction.value = action
  clearError()
  try {
    await fn()
  } catch (e) {
    console.error(`Failed to run ${action}:`, e)
    showError()
  } finally {
    pendingAction.value = ''
  }
}

function priorityLabel(p: string) {
  return p === 'high' ? prefs.t('commonHigh') : p === 'medium' ? prefs.t('commonMedium') : prefs.t('commonLow')
}

function isColCollapsed(col: Column) {
  return Number(col.collapsed || 0) === 1
}

function columnStyle(col: Column) {
  const width = validColumnWidth(col.width) ? Number(col.width) : null
  return {
    width: width ? `${width}px` : undefined,
    flexBasis: width ? `${width}px` : undefined,
  }
}

function validColumnWidth(width: unknown) {
  return typeof width === 'number' && Number.isFinite(width) && width >= 240
}

function clampColumnWidth(width: number) {
  return Math.max(240, Math.min(900, Math.round(width)))
}

const columnRows = computed(() => {
  return [{
    rowIndex: 0,
    columns: [...columns.value].sort((a, b) => a.sort_order - b.sort_order),
  }]
})

function firstColumnId() {
  return columns.value[0]?.id || 0
}

function resetTaskForm() {
  taskForm.value = { title: '', description: '', priority: 'medium', column_id: firstColumnId() }
}

// ── Data loading ──
async function loadBoards() {
  if (!authStore.authed) return
  try {
    boards.value = await api<Board[]>('/api/boards')
    if (boards.value.length && !boards.value.find(b => b.id === currentBoardId.value)) {
      currentBoardId.value = boards.value[0].id
    }
  } catch (e) {
    console.error('Failed to load boards:', e)
    showError()
  }
}

async function loadBoardData() {
  if (!authStore.authed) return
  if (!currentBoardId.value) return
  try {
    const [cols, items] = await Promise.all([
      api<Column[]>(`/api/boards/${currentBoardId.value}/columns`),
      api<TodoItem[]>(`/api/boards/${currentBoardId.value}/todos`),
    ])
    columns.value = cols
    todos.value = items
    if (!editingTodoId.value && !cols.some(col => col.id === taskForm.value.column_id)) resetTaskForm()
  } catch (e) {
    console.error('Failed to load board data:', e)
    showError()
  }
}

function switchBoard(id: number) {
  if (boardHasMoved) return
  if (id === currentBoardId.value) return
  currentBoardId.value = id
  loadBoardData()
}

async function loadInitialData() {
  if (!authStore.authed) return
  await loadBoards()
  if (currentBoardId.value) await loadBoardData()
}

// ── Board CRUD ──
async function addBoard() {
  if (!boardFormName.value.trim()) return
  await runPending('addBoard', async () => {
    const board = await api<Board>('/api/boards', {
      method: 'POST',
      body: JSON.stringify({ name: boardFormName.value.trim() }),
    })
    boards.value.push(board)
    showBoardModal.value = false
    boardFormName.value = ''
    switchBoard(board.id)
  })
}

function startEditBoard(board: Board) {
  editingBoardId.value = board.id
  editingBoardName.value = board.name
  nextTick(() => boardEditInputs.value[0]?.focus())
}

async function finishEditBoard() {
  if (!editingBoardId.value) return
  const name = editingBoardName.value.trim()
  const id = editingBoardId.value
  editingBoardId.value = null
  if (!name) return
  try {
    await api(`/api/boards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    })
    const b = boards.value.find(x => x.id === id)
    if (b) b.name = name
  } catch (e) {
    console.error('Failed to edit board:', e)
    showError()
  }
}

async function doDeleteBoard() {
  const id = showDeleteBoardModal.value
  if (!id) return
  await runPending('deleteBoard', async () => {
    showDeleteBoardModal.value = null
    await api(`/api/boards/${id}`, { method: 'DELETE' })
    boards.value = boards.value.filter(b => b.id !== id)
    if (currentBoardId.value === id && boards.value.length) {
      switchBoard(boards.value[0].id)
    }
  })
}

// ── Column CRUD ──
async function addColumn() {
  if (!colFormName.value.trim()) return
  await runPending('addColumn', async () => {
    const col = await api<Column>(`/api/boards/${currentBoardId.value}/columns`, {
      method: 'POST',
      body: JSON.stringify({ name: colFormName.value.trim() }),
    })
    columns.value.push(col)
    showColModal.value = false
    colFormName.value = ''
  })
}

function startEditCol(col: Column) {
  editingColId.value = col.id
  editingColName.value = col.name
  nextTick(() => colEditInputs.value[0]?.focus())
}

async function finishEditCol() {
  if (!editingColId.value) return
  const name = editingColName.value.trim()
  const id = editingColId.value
  editingColId.value = null
  if (!name) return
  try {
    await api(`/api/columns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    })
    const c = columns.value.find(x => x.id === id)
    if (c) c.name = name
  } catch (e) {
    console.error('Failed to edit column:', e)
    showError()
  }
}

async function toggleColumnCollapsed(col: Column) {
  const oldValue = Number(col.collapsed || 0)
  const collapsed = oldValue ? 0 : 1
  col.collapsed = collapsed
  try {
    await api(`/api/columns/${col.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ collapsed }),
    })
  } catch {
    col.collapsed = oldValue
    showError()
  }
}

async function doDeleteCol() {
  const id = showDeleteColModal.value
  if (!id) return
  const targetColumnId = columns.value
    .filter(c => c.id !== id)
    .sort((a, b) => Number(a.row_index || 0) - Number(b.row_index || 0) || a.sort_order - b.sort_order)[0]?.id
  await runPending('deleteColumn', async () => {
    showDeleteColModal.value = null
    await api(`/api/columns/${id}`, { method: 'DELETE' })
    columns.value = columns.value.filter(c => c.id !== id)
    if (targetColumnId) {
      todos.value = todos.value.map(t => t.column_id === id ? { ...t, column_id: targetColumnId } : t)
      await loadBoardData()
    } else {
      todos.value = todos.value.filter(t => t.column_id !== id)
    }
  })
}

// ── Todo CRUD ──
function openNewTodo(columnId?: number) {
  editingTodoId.value = null
  resetTaskForm()
  if (columnId && columns.value.some(col => col.id === columnId)) {
    taskForm.value.column_id = columnId
  }
  showTaskModal.value = true
}

function closeTaskModal() {
  showTaskModal.value = false
  editingTodoId.value = null
  comments.value = []
  commentDraft.value = ''
  commentsLoading.value = false
  resetTaskForm()
}

function onCardClick(item: TodoItem) {
  if (hasMoved) return
  openEditTodo(item)
}

function openEditTodo(item: TodoItem) {
  editingTodoId.value = item.id
  comments.value = []
  commentDraft.value = ''
  taskForm.value = {
    title: item.title,
    description: item.description || '',
    priority: item.priority,
    column_id: item.column_id,
  }
  showTaskModal.value = true
  loadComments(item.id)
}

async function saveEditTodo() {
  if (!editingTodoId.value || !taskForm.value.title.trim()) return
  const id = editingTodoId.value
  const updates = {
    title: taskForm.value.title,
    description: taskForm.value.description,
    priority: taskForm.value.priority,
    column_id: taskForm.value.column_id,
  }
  await runPending('saveTodo', async () => {
    const updated = await api<TodoItem>(`/api/todo/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    const idx = todos.value.findIndex(t => t.id === id)
    if (idx >= 0) Object.assign(todos.value[idx], updated)
    closeTaskModal()
  })
}

async function addTodo() {
  if (!taskForm.value.title.trim()) return
  if (!columns.value.some(col => col.id === taskForm.value.column_id)) {
    taskForm.value.column_id = firstColumnId()
  }
  await runPending('saveTodo', async () => {
    const item = await api<TodoItem>('/api/todo', {
      method: 'POST',
      body: JSON.stringify({
        ...taskForm.value,
        board_id: currentBoardId.value,
      }),
    })
    todos.value.push(item)
    closeTaskModal()
  })
}

async function loadComments(todoId: number) {
  commentsLoading.value = true
  try {
    comments.value = await api<TodoComment[]>(`/api/todo/${todoId}/comments`)
  } catch (e) {
    console.error('Failed to load comments:', e)
    showError()
  } finally {
    commentsLoading.value = false
  }
}

async function addComment() {
  const todoId = editingTodoId.value
  const content = commentDraft.value.trim()
  if (!todoId || !content) return
  await runPending('addComment', async () => {
    const comment = await api<TodoComment>(`/api/todo/${todoId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    })
    comments.value.push(comment)
    commentDraft.value = ''
  })
}

async function deleteComment(comment: TodoComment) {
  const todoId = editingTodoId.value
  if (!todoId) return
  await runPending(`deleteComment:${comment.id}`, async () => {
    await api(`/api/todo/${todoId}/comments/${comment.id}`, { method: 'DELETE' })
    comments.value = comments.value.filter(item => item.id !== comment.id)
  })
}

function formatCommentTime(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleString()
}

function commentDateTime(timestamp: number) {
  return new Date(timestamp * 1000).toISOString()
}

function openActivityModal() {
  showActivityModal.value = true
  loadActivity()
}

async function loadActivity() {
  if (!currentBoardId.value) return
  activityLoading.value = true
  try {
    const params = new URLSearchParams({
      board_id: String(currentBoardId.value),
      limit: '120',
    })
    if (activityFilters.entity !== 'all') params.set('entity_type', activityFilters.entity)
    if (activityFilters.action !== 'all') params.set('action', activityFilters.action)
    if (activityFilters.q.trim()) params.set('q', activityFilters.q.trim())
    activityItems.value = await api<KanbanActivity[]>(`/api/kanban/activity?${params.toString()}`)
  } catch (e) {
    console.error('Failed to load kanban activity:', e)
    showError()
  } finally {
    activityLoading.value = false
  }
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

function formatActivityTime(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleString()
}

function activityDateTime(timestamp: number) {
  return new Date(timestamp * 1000).toISOString()
}

function askDeleteTodo(item: TodoItem) {
  todoPendingDelete.value = item
}

async function doDeleteTodo() {
  const item = todoPendingDelete.value
  if (!item) return
  await runPending('deleteTodo', async () => {
    await api(`/api/todo/${item.id}`, { method: 'DELETE' })
    todos.value = todos.value.filter(t => t.id !== item.id)
    todoPendingDelete.value = null
  })
}

// ── Drag & Drop ──
function onPointerDown(item: TodoItem, e: PointerEvent) {
  if ((e.target as HTMLElement).closest('.kanban-card-delete')) return
  if (e.button !== 0) return

  const card = e.currentTarget as HTMLElement
  const rect = card.getBoundingClientRect()
  pointerStart = {
    x: e.clientX, y: e.clientY,
    id: item.id, title: item.title,
    colId: item.column_id, width: rect.width,
  }
  hasMoved = false
  dragState.offsetX = e.clientX - rect.left
  dragState.offsetY = e.clientY - rect.top
  dragState.targetColId = 0
  dragState.insertIndex = -1

  beginLongPressDrag(cardLongPress, e)

  document.addEventListener('pointermove', onPointerMove)
  document.addEventListener('pointerup', onPointerUp)
}

function startCardDrag(e: PointerEvent) {
  if (dragState.active) return
  hasMoved = true
  dragState.active = true
  dragState.id = pointerStart.id
  dragState.title = pointerStart.title
  dragState.originColId = pointerStart.colId
  dragState.cardWidth = pointerStart.width
  dragState.x = e.clientX
  dragState.y = e.clientY
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'grabbing'
}

function onPointerMove(e: PointerEvent) {
  if (longPressBlocksDrag(cardLongPress, e)) {
    if (cardLongPress.mode === 'cancelled') hasMoved = true
    return
  }

  const dx = e.clientX - pointerStart.x
  const dy = e.clientY - pointerStart.y
  if (!hasMoved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return

  if (!hasMoved) {
    startCardDrag(e)
  }

  dragState.x = e.clientX
  dragState.y = e.clientY

  const hit = getDropTarget(e.clientX, e.clientY)
  dragState.targetColId = hit.colId
  dragState.insertIndex = hit.index
}

function getDropTarget(x: number, y: number): { colId: number; index: number } {
  if (!kanbanRef.value) return { colId: 0, index: 0 }
  const colEls = kanbanRef.value.querySelectorAll<HTMLElement>('.kanban-col[data-col-id]')

  for (const colEl of colEls) {
    const colRect = colEl.getBoundingClientRect()
    if (x < colRect.left || x > colRect.right || y < colRect.top || y > colRect.bottom) continue

    const colId = Number(colEl.dataset.colId)
    const cards = colEl.querySelectorAll<HTMLElement>('.kanban-card:not(.dragging)')
    let index = cards.length

    for (let i = 0; i < cards.length; i++) {
      const cardRect = cards[i].getBoundingClientRect()
      const midY = cardRect.top + cardRect.height / 2
      if (y < midY) { index = i; break }
    }

    if (colId === dragState.originColId) {
      const items = itemsByCol(colId)
      const dragIdx = items.findIndex(t => t.id === dragState.id)
      if (dragIdx >= 0 && index > dragIdx) index++
    }

    return { colId, index }
  }

  return { colId: 0, index: 0 }
}

async function onPointerUp() {
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerup', onPointerUp)
  if (cardLongPress.mode === 'ready' || cardLongPress.mode === 'cancelled') hasMoved = true
  resetLongPressDrag(cardLongPress)
  document.body.style.userSelect = ''
  document.body.style.cursor = ''

  if (!hasMoved || !dragState.active) {
    dragState.active = false
    dragState.id = null
    return
  }

  const id = dragState.id!
  const targetColId = dragState.targetColId
  const insertIndex = dragState.insertIndex

  dragState.active = false
  dragState.id = null

  if (!targetColId) return

  const targetItems = itemsByCol(targetColId).filter(t => t.id !== id)
  const clampedIndex = Math.min(insertIndex, targetItems.length)

  let newSortOrder: number
  if (targetItems.length === 0) {
    newSortOrder = 0
  } else if (clampedIndex === 0) {
    newSortOrder = targetItems[0].sort_order - 1000
  } else if (clampedIndex >= targetItems.length) {
    newSortOrder = targetItems[targetItems.length - 1].sort_order + 1000
  } else {
    newSortOrder = Math.floor((targetItems[clampedIndex - 1].sort_order + targetItems[clampedIndex].sort_order) / 2)
  }

  const item = todos.value.find(t => t.id === id)
  if (!item) return
  const oldColId = item.column_id
  const oldSortOrder = item.sort_order
  item.column_id = targetColId
  item.sort_order = newSortOrder

  try {
    await api(`/api/todo/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ column_id: targetColId, sort_order: newSortOrder }),
    })
  } catch {
    item.column_id = oldColId
    item.sort_order = oldSortOrder
  }
}

function onTouchPrevent(e: TouchEvent) {
  if (dragState.active || columnDragState.active || columnResizeState.active || boardDragState.active) e.preventDefault()
}

function onKanbanWheel(e: WheelEvent) {
  const viewport = kanbanViewportRef.value
  if (!viewport) return
  const cards = (e.target as HTMLElement | null)?.closest<HTMLElement>('.kanban-cards')
  if (cards && Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
    const canScrollUp = cards.scrollTop > 0
    const canScrollDown = cards.scrollTop + cards.clientHeight < cards.scrollHeight - 1
    if ((e.deltaY < 0 && canScrollUp) || (e.deltaY > 0 && canScrollDown)) {
      return
    }
  }

  e.preventDefault()
  viewport.scrollLeft += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
}

function onBoardPointerDown(board: Board, e: PointerEvent) {
  if (editingBoardId.value === board.id) return
  if (e.button !== 0) return
  const target = e.target as HTMLElement
  if (target.closest('button, input, .board-tab-delete')) return

  boardPointerStart = { x: e.clientX, y: e.clientY, id: board.id }
  boardHasMoved = false
  boardDragState.targetId = null

  beginLongPressDrag(boardLongPress, e)

  document.addEventListener('pointermove', onBoardPointerMove)
  document.addEventListener('pointerup', onBoardPointerUp)
}

function startBoardDrag() {
  if (boardDragState.active) return
  boardHasMoved = true
  boardDragState.active = true
  boardDragState.id = boardPointerStart.id
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'grabbing'
}

function onBoardPointerMove(e: PointerEvent) {
  if (longPressBlocksDrag(boardLongPress, e)) {
    if (boardLongPress.mode === 'cancelled') boardHasMoved = true
    return
  }

  const dx = e.clientX - boardPointerStart.x
  const dy = e.clientY - boardPointerStart.y
  if (!boardHasMoved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return

  if (!boardHasMoved) {
    startBoardDrag()
  }

  const hit = getBoardDropTarget(e.clientX, e.clientY)
  boardDragState.targetId = hit.id
  boardDragState.insertBefore = hit.insertBefore
}

function getBoardDropTarget(x: number, y: number): { id: number | null; insertBefore: boolean } {
  const tabs = Array.from(document.querySelectorAll<HTMLElement>('.board-tab[data-board-id]'))
  for (const tab of tabs) {
    const rect = tab.getBoundingClientRect()
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue
    return {
      id: Number(tab.dataset.boardId),
      insertBefore: x < rect.left + rect.width / 2,
    }
  }

  if (!tabs.length) return { id: null, insertBefore: false }
  const nearest = tabs
    .map(el => ({ el, rect: el.getBoundingClientRect() }))
    .reduce((best, next) => {
      const bestDistance = Math.abs(x - (best.rect.left + best.rect.width / 2)) + Math.abs(y - (best.rect.top + best.rect.height / 2))
      const nextDistance = Math.abs(x - (next.rect.left + next.rect.width / 2)) + Math.abs(y - (next.rect.top + next.rect.height / 2))
      return nextDistance < bestDistance ? next : best
    })

  return {
    id: Number(nearest.el.dataset.boardId),
    insertBefore: x < nearest.rect.left + nearest.rect.width / 2,
  }
}

async function onBoardPointerUp() {
  document.removeEventListener('pointermove', onBoardPointerMove)
  document.removeEventListener('pointerup', onBoardPointerUp)
  if (boardLongPress.mode === 'ready' || boardLongPress.mode === 'cancelled') boardHasMoved = true
  resetLongPressDrag(boardLongPress)
  document.body.style.userSelect = ''
  document.body.style.cursor = ''

  if (!boardHasMoved || !boardDragState.active) {
    boardDragState.active = false
    boardDragState.id = null
    boardDragState.targetId = null
    return
  }

  const id = boardDragState.id!
  const targetId = boardDragState.targetId
  const insertBefore = boardDragState.insertBefore
  boardDragState.active = false
  boardDragState.id = null
  boardDragState.targetId = null
  window.setTimeout(() => { boardHasMoved = false }, 0)

  if (!targetId || targetId === id) return

  const moving = boards.value.find(b => b.id === id)
  if (!moving) return

  const ordered = boards.value.filter(b => b.id !== id).sort((a, b) => a.sort_order - b.sort_order)
  const targetIndex = ordered.findIndex(b => b.id === targetId)
  if (targetIndex < 0) return
  const insertIndex = insertBefore ? targetIndex : targetIndex + 1
  ordered.splice(insertIndex, 0, moving)

  const prev = insertIndex > 0 ? ordered[insertIndex - 1] : null
  const next = insertIndex < ordered.length - 1 ? ordered[insertIndex + 1] : null

  let newSortOrder: number
  if (!prev && !next) {
    newSortOrder = 0
  } else if (!prev) {
    newSortOrder = next!.sort_order - 1000
  } else if (!next) {
    newSortOrder = prev.sort_order + 1000
  } else {
    newSortOrder = Math.floor((prev.sort_order + next.sort_order) / 2)
  }

  const oldSortOrder = moving.sort_order
  moving.sort_order = newSortOrder
  boards.value = [...boards.value].sort((a, b) => a.sort_order - b.sort_order)

  try {
    const updated = await api<Board>(`/api/boards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ sort_order: newSortOrder }),
    })
    Object.assign(moving, updated)
  } catch (e) {
    console.error('Failed to reorder board:', e)
    moving.sort_order = oldSortOrder
    boards.value = [...boards.value].sort((a, b) => a.sort_order - b.sort_order)
  }
}

function onColumnPointerDown(col: Column, e: PointerEvent) {
  if (editingColId.value === col.id) return
  if (isColCollapsed(col)) return
  if (e.button !== 0) return
  const target = e.target as HTMLElement
  if (target.closest('button, input, .kanban-cards, .kanban-resize-handle')) return

  columnPointerStart = { x: e.clientX, y: e.clientY, id: col.id }
  columnHasMoved = false
  columnDragState.targetColId = null

  beginLongPressDrag(columnLongPress, e)

  document.addEventListener('pointermove', onColumnPointerMove)
  document.addEventListener('pointerup', onColumnPointerUp)
}

function startColumnDrag() {
  if (columnDragState.active) return
  columnHasMoved = true
  columnDragState.active = true
  columnDragState.id = columnPointerStart.id
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'grabbing'
}

function onColumnHeaderClick(col: Column) {
  if (isColCollapsed(col)) toggleColumnCollapsed(col)
}

function onColumnResizePointerDown(col: Column, e: PointerEvent) {
  if (e.button !== 0) return
  const el = (e.currentTarget as HTMLElement).closest<HTMLElement>('.kanban-col')
  if (!el) return
  const rect = el.getBoundingClientRect()
  columnResizeState.active = true
  columnResizeState.id = col.id
  columnResizeState.startX = e.clientX
  columnResizeState.startWidth = rect.width
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'ew-resize'
  document.addEventListener('pointermove', onColumnResizePointerMove)
  document.addEventListener('pointerup', onColumnResizePointerUp)
}

function onColumnResizePointerMove(e: PointerEvent) {
  if (!columnResizeState.active || !columnResizeState.id) return
  const col = columns.value.find(c => c.id === columnResizeState.id)
  if (!col) return

  col.width = clampColumnWidth(columnResizeState.startWidth + e.clientX - columnResizeState.startX)
}

async function onColumnResizePointerUp() {
  document.removeEventListener('pointermove', onColumnResizePointerMove)
  document.removeEventListener('pointerup', onColumnResizePointerUp)
  document.body.style.userSelect = ''
  document.body.style.cursor = ''

  if (!columnResizeState.active || !columnResizeState.id) {
    columnResizeState.active = false
    columnResizeState.id = null
    return
  }

  const id = columnResizeState.id
  const col = columns.value.find(c => c.id === id)
  columnResizeState.active = false
  columnResizeState.id = null
  if (!col) return

  const updates: { width?: number } = {}
  if (validColumnWidth(col.width)) updates.width = Number(col.width)
  if (!Object.keys(updates).length) return

  try {
    const updated = await api<Column>(`/api/columns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    Object.assign(col, updated)
  } catch (e) {
    console.error('Failed to resize column:', e)
    loadBoardData()
  }
}

function onColumnPointerMove(e: PointerEvent) {
  if (longPressBlocksDrag(columnLongPress, e)) {
    if (columnLongPress.mode === 'cancelled') columnHasMoved = true
    return
  }

  const dx = e.clientX - columnPointerStart.x
  const dy = e.clientY - columnPointerStart.y
  if (!columnHasMoved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return

  if (!columnHasMoved) {
    startColumnDrag()
  }

  const hit = getColumnDropTarget(e.clientX, e.clientY)
  columnDragState.targetColId = hit.colId
  columnDragState.targetRowIndex = hit.rowIndex
  columnDragState.insertBefore = hit.insertBefore
}

function getColumnDropTarget(x: number, y: number): { colId: number | null; rowIndex: number; insertBefore: boolean } {
  if (!kanbanRef.value) return { colId: null, rowIndex: 0, insertBefore: false }

  const colEls = Array.from(kanbanRef.value.querySelectorAll<HTMLElement>('.kanban-col[data-col-id]'))
  for (const colEl of colEls) {
    const rect = colEl.getBoundingClientRect()
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue
    return {
      colId: Number(colEl.dataset.colId),
      rowIndex: 0,
      insertBefore: x < rect.left + rect.width / 2,
    }
  }

  if (!colEls.length) return { colId: null, rowIndex: 0, insertBefore: false }
  const nearest = colEls
    .map(el => ({ el, rect: el.getBoundingClientRect() }))
    .reduce((best, next) => {
      const bestDistance = Math.abs(x - (best.rect.left + best.rect.width / 2))
      const nextDistance = Math.abs(x - (next.rect.left + next.rect.width / 2))
      return nextDistance < bestDistance ? next : best
    })
  return {
    colId: Number(nearest.el.dataset.colId),
    rowIndex: 0,
    insertBefore: x < nearest.rect.left + nearest.rect.width / 2,
  }
}

async function onColumnPointerUp() {
  document.removeEventListener('pointermove', onColumnPointerMove)
  document.removeEventListener('pointerup', onColumnPointerUp)
  if (columnLongPress.mode === 'ready' || columnLongPress.mode === 'cancelled') columnHasMoved = true
  resetLongPressDrag(columnLongPress)
  document.body.style.userSelect = ''
  document.body.style.cursor = ''

  if (!columnHasMoved || !columnDragState.active) {
    columnDragState.active = false
    columnDragState.id = null
    columnDragState.targetColId = null
    return
  }

  const id = columnDragState.id!
  const targetColId = columnDragState.targetColId
  const targetRowIndex = columnDragState.targetRowIndex
  const insertBefore = columnDragState.insertBefore

  columnDragState.active = false
  columnDragState.id = null
  columnDragState.targetColId = null

  if (targetColId === null) return

  const moving = columns.value.find(c => c.id === id)
  if (!moving) return

  const oldRowIndex = Number(moving.row_index || 0)
  if (targetColId === id && targetRowIndex === oldRowIndex) return

  const rowColumns = columns.value
    .filter(c => c.id !== id)
    .sort((a, b) => a.sort_order - b.sort_order)

  let insertIndex = rowColumns.length
  if (targetColId !== null) {
    const targetIndex = rowColumns.findIndex(c => c.id === targetColId)
    if (targetIndex < 0) return
    insertIndex = insertBefore ? targetIndex : targetIndex + 1
  }

  const reordered = [...rowColumns]
  reordered.splice(insertIndex, 0, moving)

  const prev = insertIndex > 0 ? reordered[insertIndex - 1] : null
  const next = insertIndex < reordered.length - 1 ? reordered[insertIndex + 1] : null

  let newSortOrder: number
  if (!prev && !next) {
    newSortOrder = 0
  } else if (!prev) {
    newSortOrder = next!.sort_order - 1000
  } else if (!next) {
    newSortOrder = prev.sort_order + 1000
  } else {
    newSortOrder = Math.floor((prev.sort_order + next.sort_order) / 2)
  }

  const oldSortOrder = moving.sort_order
  moving.row_index = targetRowIndex
  moving.sort_order = newSortOrder
  columns.value = [...columns.value].sort((a, b) => a.sort_order - b.sort_order)

  try {
    await api(`/api/columns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ row_index: targetRowIndex, sort_order: newSortOrder }),
    })
  } catch {
    moving.row_index = oldRowIndex
    moving.sort_order = oldSortOrder
    columns.value = [...columns.value].sort((a, b) => a.sort_order - b.sort_order)
  }
}

// ── Lifecycle ──
watch(() => columns.value, (cols) => {
  if (!editingTodoId.value && !cols.some(col => col.id === taskForm.value.column_id)) resetTaskForm()
})

watch(() => authStore.authed, (authed) => {
  if (authed) loadInitialData()
}, { immediate: true })

onMounted(() => {
  document.body.classList.add('todo-board-page')
  if (!authStore.checked) {
    authStore.check()
  }
  document.addEventListener('touchmove', onTouchPrevent, { passive: false })
})

onUnmounted(() => {
  document.body.classList.remove('todo-board-page')
  resetLongPressDrag(cardLongPress)
  resetLongPressDrag(columnLongPress)
  resetLongPressDrag(boardLongPress)
  document.removeEventListener('touchmove', onTouchPrevent)
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerup', onPointerUp)
  document.removeEventListener('pointermove', onColumnPointerMove)
  document.removeEventListener('pointerup', onColumnPointerUp)
  document.removeEventListener('pointermove', onColumnResizePointerMove)
  document.removeEventListener('pointerup', onColumnResizePointerUp)
  document.removeEventListener('pointermove', onBoardPointerMove)
  document.removeEventListener('pointerup', onBoardPointerUp)
})
</script>

<style scoped>
.todo-page {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Toolbar */
.board-toolbar-section {
  position: sticky;
  top: 0;
  z-index: 20;
  padding: 12px 24px 8px;
  background: color-mix(in srgb, var(--color-bg) 92%, transparent);
  backdrop-filter: blur(14px);
  border-bottom: var(--border-light);
}

.board-toolbar {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) auto;
  align-items: center;
  gap: 14px;
  max-width: 1680px;
  margin: 0 auto;
}

/* Board tabs */
.board-tabs {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
  overflow-x: auto;
  padding: 2px 2px 4px;
  scrollbar-width: thin;
}

.board-tab {
  padding: 6px 16px;
  border: var(--border);
  border-radius: 100px;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: background .15s, color .15s;
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  user-select: none;
}

.board-tab:hover { background: var(--color-bg-hover, #f5f5f5); }
.board-tab.active {
  background: var(--color-ink);
  color: #fff;
}

.board-tab.dragging {
  opacity: .45;
  box-shadow: var(--shadow-sm);
}

.board-tab.drop-before::before,
.board-tab.drop-after::after {
  content: '';
  position: absolute;
  top: 5px;
  bottom: 5px;
  width: 3px;
  border-radius: 999px;
  background: var(--color-accent);
}

.board-tab.drop-before::before { left: -6px; }
.board-tab.drop-after::after { right: -6px; }

.board-tab-input {
  border: none;
  background: transparent;
  font: inherit;
  color: inherit;
  width: 80px;
  outline: none;
}

.board-tab-delete {
  font-size: 0.65rem;
  opacity: 0;
  transition: opacity .15s;
  cursor: pointer;
}
.board-tab:hover .board-tab-delete { opacity: .5; }
.board-tab-delete:hover { opacity: 1 !important; }

.board-tab-add {
  border-style: dashed;
  opacity: .5;
}
.board-tab-add:hover { opacity: 1; }

.board-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  white-space: nowrap;
}

.board-error {
  grid-column: 1 / 3;
  margin: -2px 0 0;
  color: var(--color-danger);
  font-size: .85rem;
}

/* ── Kanban viewport ── */
.kanban-section {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding-top: 12px;
  padding-bottom: 16px;
}

.kanban-viewport {
  --kanban-col-width: clamp(280px, calc((100vw - 80px) / 4), 470px);
  width: 100%;
  height: 100%;
  padding: 0 24px;
  overflow-x: auto;
  overflow-y: hidden;
}

.kanban {
  height: 100%;
  min-height: 0;
  width: max-content;
  min-width: 100%;
}

.kanban-row {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 16px;
  height: 100%;
  min-height: 0;
  min-width: 100%;
  width: max-content;
}

/* ── Columns ── */
.kanban-col {
  --collapsed-col-width: 64px;
  background: var(--color-card);
  border: var(--border);
  border-radius: var(--radius-md);
  width: var(--kanban-col-width);
  min-width: 240px;
  flex: 0 0 var(--kanban-col-width);
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: opacity .15s ease, box-shadow .15s ease, width .18s ease, flex-basis .18s ease;
}

.kanban-col.collapsed {
  width: var(--collapsed-col-width) !important;
  min-width: var(--collapsed-col-width);
  flex-basis: var(--collapsed-col-width) !important;
  overflow: hidden;
}

.kanban-col.dragging {
  opacity: .45;
  box-shadow: var(--shadow-md);
}

.kanban-col.drop-before::before,
.kanban-col.drop-after::after {
  content: '';
  position: absolute;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 999px;
  background: var(--color-accent);
  z-index: 2;
}

.kanban-col.drop-before::before { left: -10px; }
.kanban-col.drop-after::after { right: -10px; }

.kanban.column-dragging .kanban-col-header {
  cursor: grabbing;
}

.kanban-col-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: var(--border);
  gap: 10px;
  cursor: grab;
  user-select: none;
}

.kanban-col.collapsed .kanban-col-header {
  height: 100%;
  align-items: center;
  justify-content: flex-start;
  flex-direction: column;
  gap: 12px;
  padding: 12px 8px;
  border-bottom: none;
  overflow: hidden;
}

.kanban-col-label {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.kanban-col.collapsed .kanban-col-label {
  flex: 1;
  min-height: 0;
  flex-direction: column;
  justify-content: flex-start;
}

.kanban-col-title {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: .02em;
  text-transform: uppercase;
  color: var(--color-muted);
  overflow-wrap: anywhere;
}

.kanban-col.collapsed .kanban-col-title {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  max-width: none;
  max-height: 100%;
  overflow: hidden;
  line-height: 1.2;
}

.kanban-col-count {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
  flex-shrink: 0;
}

.kanban-col-tools {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.kanban-col.collapsed .kanban-col-tools {
  flex-direction: column;
  margin-top: 0;
}

.kanban-col.collapsed .kanban-col-delete,
.kanban-col.collapsed .kanban-resize-handle {
  display: none;
}

.kanban-col-tool {
  width: 24px;
  height: 24px;
  border: var(--border);
  border-radius: 50%;
  background: transparent;
  color: var(--color-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: .85rem;
  line-height: 1;
  cursor: pointer;
  transition: background .15s ease, color .15s ease, opacity .15s ease;
}

.kanban-col-tool:hover {
  background: var(--color-bg-hover, #f5f5f5);
  color: var(--color-ink);
}

/* ── Cards area ── */
.kanban-cards {
  padding: 10px 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border-radius: var(--radius-sm);
  transition: background .15s ease;
}

.kanban-cards.drag-over {
  background: var(--color-accent-light);
}

/* ── Cards ── */
.kanban-card {
  background: var(--color-card);
  border: var(--border);
  border-radius: var(--radius-sm);
  padding: 16px 18px;
  cursor: grab;
  position: relative;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  transition: box-shadow .2s var(--ease), transform .2s var(--ease);
}

.kanban-card:hover {
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.kanban-card:active { cursor: grabbing; }

.kanban-card.dragging {
  opacity: .2;
  transform: scale(.96);
  transition: opacity .15s, transform .15s;
}

.kanban-card-title {
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 4px;
}

.kanban-card-desc {
  font-size: 0.82rem;
  color: var(--color-muted);
  line-height: 1.5;
  margin-bottom: 10px;
}

.kanban-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid rgba(32, 33, 36, .06);
}

.kanban-card-delete {
  margin-left: auto;
  cursor: pointer;
  opacity: 0;
  font-size: .75rem;
  transition: opacity .15s;
}
.kanban-card:hover .kanban-card-delete { opacity: .4; }
.kanban-card-delete:hover { opacity: .8 !important; }

.kanban-card-id {
  position: absolute;
  top: 8px;
  right: 10px;
  padding: 2px 6px;
  border: var(--border-light);
  border-radius: 999px;
  background: var(--color-card);
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: .68rem;
  line-height: 1.3;
  opacity: 0;
  pointer-events: none;
  transition: opacity .15s ease;
}

.kanban-card:hover .kanban-card-id {
  opacity: .8;
}

.kanban-add-card {
  width: 100%;
  min-height: 36px;
  border: 1px dashed var(--color-border, rgba(32, 33, 36, .18));
  border-radius: var(--radius-sm);
  color: var(--color-muted);
  background: transparent;
  font-size: 1.15rem;
  line-height: 1;
  opacity: 0;
  cursor: pointer;
  transition: opacity .15s ease, background .15s ease, border-color .15s ease, color .15s ease;
}

.kanban-cards:hover .kanban-add-card,
.kanban-add-card:focus-visible {
  opacity: 1;
}

.kanban-add-card:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
  color: var(--color-ink);
}

.task-id-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: var(--border);
  border-radius: 999px;
  color: var(--color-muted);
  font-size: .78rem;
}

.task-id-row code {
  color: var(--color-ink);
  font-family: var(--font-mono);
  font-size: .78rem;
}

.task-comments {
  border-top: var(--border-light);
  padding-top: 16px;
}

.task-comments-header,
.task-comment-meta,
.task-comment-form {
  display: flex;
  align-items: center;
  gap: 10px;
}

.task-comments-header {
  justify-content: space-between;
  margin-bottom: 10px;
}

.task-comments-header h3 {
  font-size: .9rem;
  font-weight: 600;
}

.task-comment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
  margin-bottom: 10px;
}

.task-comment,
.task-comment-empty {
  border: var(--border-light);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  background: var(--color-bg-soft, rgba(32, 33, 36, .03));
}

.task-comment p,
.task-comment-empty {
  color: var(--color-muted);
  font-size: .84rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.task-comment-meta {
  justify-content: space-between;
  margin-top: 8px;
  color: var(--color-muted);
  font-size: .72rem;
}

.task-comment-delete {
  border: none;
  background: transparent;
  color: var(--color-danger);
  cursor: pointer;
  font-size: .74rem;
  padding: 2px 0;
}

.task-comment-delete:disabled {
  cursor: default;
  opacity: .45;
}

.task-comment-form {
  align-items: flex-end;
}

.task-comment-form textarea {
  flex: 1;
  min-height: 58px;
}

.history-modal {
  width: min(760px, calc(100vw - 32px));
}

.history-header,
.history-filters,
.history-item-main,
.history-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.history-header {
  justify-content: space-between;
  margin-bottom: 16px;
}

.history-filters {
  align-items: flex-end;
  flex-wrap: wrap;
  padding-bottom: 14px;
  border-bottom: var(--border-light);
  margin-bottom: 14px;
}

.history-filter {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 140px;
  flex: 1 1 140px;
  color: var(--color-muted);
  font-size: .76rem;
}

.history-filter-search {
  flex: 2 1 220px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: min(58vh, 540px);
  overflow-y: auto;
  padding-right: 2px;
}

.history-empty,
.history-item {
  border: var(--border-light);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  background: var(--color-bg-soft, rgba(32, 33, 36, .03));
}

.history-empty {
  color: var(--color-muted);
  font-size: .86rem;
  text-align: center;
}

.history-item-main {
  align-items: flex-start;
}

.history-item-main strong {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: .9rem;
  line-height: 1.45;
}

.history-badge {
  flex: 0 0 auto;
  border: var(--border);
  border-radius: 999px;
  padding: 3px 8px;
  color: var(--color-muted);
  font-size: .72rem;
  line-height: 1.35;
}

.history-details {
  margin: 8px 0 0;
  color: var(--color-muted);
  font-size: .84rem;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.history-meta {
  flex-wrap: wrap;
  margin-top: 8px;
  color: var(--color-muted);
  font-size: .72rem;
}

/* ── Priority dots ── */
.kanban-priority {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.kanban-priority.high { background: var(--color-danger); }
.kanban-priority.medium { background: var(--color-warn); }
.kanban-priority.low { background: var(--color-accent); }

/* ── Drag helpers ── */
.kanban-drop-placeholder {
  height: 52px;
  border: 2px dashed var(--color-accent);
  border-radius: var(--radius-sm);
  background: var(--color-accent-light);
  opacity: .45;
  flex-shrink: 0;
}

.kanban-ghost {
  background: var(--color-card);
  border: var(--border);
  border-radius: var(--radius-sm);
  padding: 16px 18px;
  box-shadow: 0 16px 40px rgba(32, 33, 36, .18);
  transform: rotate(2deg) scale(1.04);
  opacity: .92;
}

/* ── Column editing ── */
.col-edit-input {
  border: none;
  background: transparent;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: .02em;
  text-transform: uppercase;
  color: var(--color-muted);
  width: 120px;
  outline: none;
}

.kanban-col-delete {
  opacity: 0;
}
.kanban-col:hover .kanban-col-delete { opacity: .4; }
.kanban-col-delete:hover { opacity: .8 !important; }

.kanban-resize-handle {
  position: absolute;
  opacity: 0;
  z-index: 3;
  transition: opacity .15s ease, background .15s ease;
}

.kanban-col:hover .kanban-resize-handle,
.kanban-resize-handle:focus-visible {
  opacity: 1;
}

.kanban-resize-handle-x {
  top: 58px;
  right: -5px;
  bottom: 18px;
  width: 10px;
  cursor: ew-resize;
}

.kanban-resize-handle-x::after {
  content: '';
  position: absolute;
  border-radius: 999px;
  background: rgba(32, 33, 36, .28);
}

.kanban-resize-handle-x::after {
  top: 0;
  bottom: 0;
  left: 4px;
  width: 2px;
}

@media (max-width: 720px) {
  .todo-page {
    overflow: hidden;
  }

  .board-toolbar-section {
    padding: 10px 14px 8px;
  }

  .board-toolbar {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .board-tabs {
    order: 2;
    gap: 6px;
    padding-bottom: 5px;
  }

  .board-actions {
    order: 1;
    justify-content: flex-start;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: none;
  }

  .board-actions::-webkit-scrollbar {
    display: none;
  }

  .board-actions .btn,
  .board-tab {
    flex: 0 0 auto;
  }

  .board-tab-delete {
    opacity: .45;
  }

  .board-error {
    grid-column: auto;
  }

  .kanban-section {
    padding-top: 10px;
    padding-bottom: calc(12px + env(safe-area-inset-bottom));
  }

  .kanban-viewport {
    --kanban-col-width: calc(100vw - 28px);
    padding: 0 14px;
  }

  .kanban-row {
    gap: 12px;
  }

  .kanban-col {
    width: var(--kanban-col-width) !important;
    min-width: var(--kanban-col-width);
    max-width: var(--kanban-col-width);
    flex-basis: var(--kanban-col-width) !important;
    border-radius: var(--radius-sm);
  }

  .kanban-col.collapsed {
    --collapsed-col-width: 54px;
    min-width: var(--collapsed-col-width);
  }

  .kanban-col-header {
    padding: 14px 14px 12px;
  }

  .kanban-cards {
    padding: 8px;
    gap: 8px;
  }

  .kanban-card {
    padding: 14px;
  }

  .kanban-card-id {
    position: static;
    display: inline-flex;
    width: max-content;
    margin-bottom: 8px;
    opacity: .8;
  }

  .kanban-card-delete,
  .kanban-col-delete,
  .kanban-add-card {
    opacity: .55;
  }

  .kanban-add-card {
    min-height: 42px;
  }

  .kanban-resize-handle {
    display: none;
  }

  .task-comment-form {
    align-items: stretch;
    flex-direction: column;
  }

  .task-comment-form .btn {
    align-self: flex-end;
  }

  .history-modal {
    width: 100%;
  }

  .history-header {
    align-items: flex-start;
  }

  .history-filters {
    align-items: stretch;
  }

  .history-filter,
  .history-filters .btn {
    flex-basis: 100%;
  }
}

@media (max-width: 420px) {
  .board-actions .btn-sm {
    padding-inline: 12px;
  }

  .kanban-col-title {
    font-size: .8rem;
  }

  .kanban-card-title {
    font-size: .9rem;
  }
}
</style>
