<template>
  <PasswordGate>
    <main class="todo-page">
      <!-- Header -->
      <section class="board-toolbar-section">
        <div class="board-toolbar fade-up">
          <div class="board-navigation">
            <div class="board-tabs-row">
              <div class="folder-control folder-filter" aria-label="Board folders">
                <span class="folder-control-label">{{ prefs.t('todoFolderView') }}</span>
                <select class="folder-control-select folder-filter-select" :value="String(currentFolderFilter)" @change="onFolderFilterChange">
                  <option value="all">{{ prefs.t('todoAllFolders') }}</option>
                  <option value="unfiled">{{ prefs.t('todoUnfiledBoards') }}</option>
                  <option v-for="folder in folders" :key="folder.id" :value="String(folder.id)">{{ folder.name }}</option>
                </select>
                <button
                  v-if="selectedFolder"
                  class="folder-filter-action"
                  type="button"
                  :title="prefs.t('todoRenameFolder')"
                  @click="openRenameFolderModal">
                  {{ prefs.t('commonEdit') }}
                </button>
                <button
                  v-if="selectedFolder"
                  class="folder-filter-action danger"
                  type="button"
                  :title="prefs.t('todoDeleteFolder')"
                  @click="openDeleteSelectedFolderModal">
                  ✕
                </button>
              </div>
              <div class="board-tabs" aria-label="Boards">
                <div
                  v-for="board in visibleBoards" :key="board.id"
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
                <p v-if="!visibleBoards.length" class="board-empty">{{ prefs.t('todoNoBoardsInFolder') }}</p>
              </div>
            </div>
          </div>
          <div class="board-actions">
            <div class="task-search" ref="taskSearchRef">
              <input
                class="task-search-input"
                v-model="taskSearchQuery"
                :placeholder="prefs.t('todoSearchTasks')"
                @input="onTaskSearch"
                @focus="onTaskSearch">
              <button v-if="taskSearchQuery" type="button" class="task-search-clear" @click="clearTaskSearch">✕</button>
              <div v-if="showSearchResults" class="task-search-results">
                <p v-if="!taskSearchResults.length" class="task-search-empty">{{ prefs.t('todoHistoryEmpty') }}</p>
                <button v-for="hit in taskSearchResults" :key="hit.id" type="button" class="task-search-hit" @click="jumpToHit(hit)">
                  <span class="task-search-hit-title">#{{ hit.id }} {{ hit.title }}</span>
                  <span class="task-search-hit-loc">{{ hit.board_name }} · {{ hit.column_name }}</span>
                </button>
              </div>
            </div>
            <label v-if="currentBoard" class="folder-control board-folder-control">
              <span class="folder-control-label">{{ prefs.t('todoBoardFolderShort') }}</span>
              <select class="folder-control-select board-folder-select" :value="currentBoard.folder_id ?? ''" @change="onCurrentBoardFolderChange">
                <option value="">{{ prefs.t('todoUnfiledBoards') }}</option>
                <option v-for="folder in folders" :key="folder.id" :value="folder.id">{{ folder.name }}</option>
              </select>
            </label>
            <button class="btn btn-sm" @click="openActivityModal()">{{ prefs.t('todoHistory') }}</button>
            <button class="btn btn-sm" @click="openFolderModal">+ {{ prefs.t('todoAddFolder') }}</button>
            <button class="btn btn-sm" @click="openBoardModal">+ {{ prefs.t('todoAddBoard') }}</button>
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
                        :title="prefs.t('todoHistory')"
                        @pointerdown.stop
                        @click.stop="openActivityModal({ entity: 'column', id: col.id, title: col.name })">
                        ◷
                      </button>
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
                        :class="{ dragging: dragState.id === item.id, 'search-hit': searchHitId === item.id }"
                        :data-id="item.id"
                        @pointerdown="onPointerDown(item, $event)"
                        @click="onCardClick(item)">
                        <span class="kanban-card-id">#{{ item.id }}</span>
                        <div class="kanban-card-title">{{ item.title }}</div>
                        <div v-if="item.description" class="kanban-card-desc" v-html="renderMarkdown(item.description)"></div>
                        <div class="kanban-card-meta">
                          <span class="kanban-priority" :class="item.priority"></span>
                          <span class="text-xs">{{ priorityLabel(item.priority) }}</span>
                          <span v-if="item.due_date" class="kanban-card-due" :class="dueClass(item.due_date)">{{ item.due_date }}</span>
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
        <div v-if="editingTodoId" class="task-modal-head mb-16">
          <div class="task-id-row">
            <span>{{ prefs.t('todoTaskId') }}</span>
            <code>#{{ editingTodoId }}</code>
          </div>
          <button
            class="btn btn-sm"
            type="button"
            @click="openActivityModal({ entity: 'todo', id: editingTodoId, title: taskForm.title })">
            {{ prefs.t('todoHistory') }}
          </button>
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
        <div class="form-group mb-16">
          <label class="form-label">{{ prefs.t('todoDueDate') }}</label>
          <input type="date" class="input" v-model="taskForm.due_date">
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
                <span class="task-comment-identity">{{ comment.author || '用户' }}</span>
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
        <div class="form-group mb-20">
          <label class="form-label">{{ prefs.t('todoBoardFolder') }}</label>
          <select class="input" v-model="boardFormFolderId">
            <option value="">{{ prefs.t('todoUnfiledBoards') }}</option>
            <option v-for="folder in folders" :key="folder.id" :value="String(folder.id)">{{ folder.name }}</option>
          </select>
        </div>
        <div class="flex gap-12" style="justify-content: flex-end;">
          <button class="btn" @click="showBoardModal = false">{{ prefs.t('commonCancel') }}</button>
          <button class="btn btn-filled" :disabled="pendingAction === 'addBoard'" @click="addBoard">{{ prefs.t('commonCreate') }}</button>
        </div>
      </AppModal>

      <!-- New Folder Modal -->
      <AppModal :visible="showFolderModal" @close="showFolderModal = false">
        <h2 class="heading-md mb-20">{{ prefs.t('todoNewFolder') }}</h2>
        <div class="form-group mb-20">
          <label class="form-label">{{ prefs.t('todoFolderName') }}</label>
          <input class="input" v-model="folderFormName" :placeholder="prefs.t('todoFolderNamePlaceholder')" @keydown.enter="addFolder">
        </div>
        <div class="flex gap-12" style="justify-content: flex-end;">
          <button class="btn" @click="showFolderModal = false">{{ prefs.t('commonCancel') }}</button>
          <button class="btn btn-filled" :disabled="pendingAction === 'addFolder'" @click="addFolder">{{ prefs.t('commonCreate') }}</button>
        </div>
      </AppModal>

      <!-- Rename Folder Modal -->
      <AppModal :visible="showRenameFolderModal" @close="showRenameFolderModal = false">
        <h2 class="heading-md mb-20">{{ prefs.t('todoRenameFolder') }}</h2>
        <div class="form-group mb-20">
          <label class="form-label">{{ prefs.t('todoFolderName') }}</label>
          <input class="input" v-model="folderRenameName" :placeholder="prefs.t('todoFolderNamePlaceholder')" @keydown.enter="renameFolder">
        </div>
        <div class="flex gap-12" style="justify-content: flex-end;">
          <button class="btn" @click="showRenameFolderModal = false">{{ prefs.t('commonCancel') }}</button>
          <button class="btn btn-filled" :disabled="pendingAction === 'renameFolder'" @click="renameFolder">{{ prefs.t('commonSave') }}</button>
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
            <div class="history-title">
              <h2 class="heading-md">{{ prefs.t('todoHistoryTitle') }}</h2>
              <p v-if="activityScope">{{ prefs.tr('todoHistoryScope', { name: activityScope.title }) }}</p>
            </div>
            <button class="btn btn-sm" type="button" :disabled="activityLoading" @click="loadActivity">
              {{ prefs.t('todoHistoryRefresh') }}
            </button>
          </div>
          <div class="history-filters">
            <label v-if="!activityScope" class="history-filter">
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

      <!-- Delete Folder Confirm Modal -->
      <AppModal :visible="showDeleteFolderModal !== null" @close="showDeleteFolderModal = null">
        <h2 class="heading-md mb-12">{{ prefs.t('todoDeleteFolder') }}</h2>
        <p class="text-body mb-20">{{ prefs.tr('todoDeleteFolderConfirm', { name: deleteFolderName }) }}</p>
        <div class="flex gap-12" style="justify-content: flex-end;">
          <button class="btn" @click="showDeleteFolderModal = null">{{ prefs.t('commonCancel') }}</button>
          <button class="btn btn-danger-filled" :disabled="pendingAction === 'deleteFolder'" @click="doDeleteFolder">{{ prefs.t('commonDelete') }}</button>
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
import type {
  TodoItem, TodoComment, Board, BoardFolder, Column, KanbanActivity, ActivityScope, TodoSearchHit,
} from '../types/kanban'
import {
  createLongPressDrag,
  beginLongPressDrag,
  resetLongPressDrag,
  longPressBlocksDrag,
} from '../composables/useLongPressDrag'
import { marked } from 'marked'

const authStore = useAuthStore()
const prefs = usePreferencesStore()

// ── State ──
const boards = ref<Board[]>([])
const folders = ref<BoardFolder[]>([])
const columns = ref<Column[]>([])
const todos = ref<TodoItem[]>([])
const currentBoardId = ref<number>(0)
type FolderFilter = 'all' | 'unfiled' | number
const currentFolderFilter = ref<FolderFilter>('all')
const kanbanRef = ref<HTMLElement | null>(null)
const kanbanViewportRef = ref<HTMLElement | null>(null)

// Modals
const showTaskModal = ref(false)
const showBoardModal = ref(false)
const showFolderModal = ref(false)
const showRenameFolderModal = ref(false)
const showColModal = ref(false)
const showDeleteBoardModal = ref<number | null>(null)
const showDeleteFolderModal = ref<number | null>(null)
const showDeleteColModal = ref<number | null>(null)
const todoPendingDelete = ref<TodoItem | null>(null)
const boardError = ref('')
const pendingAction = ref('')

// Forms
const taskForm = ref({ title: '', description: '', priority: 'medium', due_date: '', column_id: 0 })

// Cross-board task search
const taskSearchQuery = ref('')
const taskSearchResults = ref<TodoSearchHit[]>([])
const showSearchResults = ref(false)
const searchHitId = ref<number | null>(null)
const taskSearchRef = ref<HTMLElement | null>(null)
let taskSearchTimer: ReturnType<typeof setTimeout> | null = null
const boardFormName = ref('')
const boardFormFolderId = ref('')
const folderFormName = ref('')
const folderRenameName = ref('')
const colFormName = ref('')
const editingTodoId = ref<number | null>(null)
const comments = ref<TodoComment[]>([])
const commentDraft = ref('')
const commentsLoading = ref(false)
const showActivityModal = ref(false)
const activityItems = ref<KanbanActivity[]>([])
const activityLoading = ref(false)
const activityScope = ref<ActivityScope | null>(null)
const activityFilters = reactive({
  entity: 'all',
  action: 'all',
  q: '',
})

// Board editing
const editingBoardId = ref<number | null>(null)
const editingBoardName = ref('')
const boardEditInputs = ref<HTMLInputElement[]>([])

const visibleBoards = computed(() => {
  const list = boards.value.filter((board) => {
    if (currentFolderFilter.value === 'all') return true
    if (currentFolderFilter.value === 'unfiled') return board.folder_id === null
    return board.folder_id === currentFolderFilter.value
  })
  return [...list].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
})

const currentBoard = computed(() => boards.value.find(board => board.id === currentBoardId.value) || null)
const selectedFolder = computed(() => {
  if (typeof currentFolderFilter.value !== 'number') return null
  return folders.value.find(folder => folder.id === currentFolderFilter.value) || null
})

const deleteFolderName = computed(() => {
  if (!showDeleteFolderModal.value) return ''
  return folders.value.find(folder => folder.id === showDeleteFolderModal.value)?.name || ''
})

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

function renderMarkdown(text: string): string {
  return marked.parse(text || '', { breaks: true, async: false }) as string
}

function dueClass(due: string | null): string {
  if (!due) return ''
  const today = new Date().toISOString().split('T')[0]
  if (due < today) return 'overdue'
  if (due === today) return 'due-today'
  return ''
}

function onTaskSearch() {
  if (taskSearchTimer) clearTimeout(taskSearchTimer)
  const q = taskSearchQuery.value.trim()
  if (!q) { showSearchResults.value = false; taskSearchResults.value = []; return }
  taskSearchTimer = setTimeout(async () => {
    if (!authStore.authed) return
    try {
      taskSearchResults.value = await api<TodoSearchHit[]>(`/api/todo/search?q=${encodeURIComponent(q)}`)
      showSearchResults.value = true
    } catch (e) {
      console.error('Task search failed:', e)
    }
  }, 250)
}

function clearTaskSearch() {
  taskSearchQuery.value = ''
  taskSearchResults.value = []
  showSearchResults.value = false
}

async function jumpToHit(hit: TodoSearchHit) {
  showSearchResults.value = false
  taskSearchQuery.value = ''
  if (hit.board_id !== currentBoardId.value) {
    switchBoard(hit.board_id)
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  await nextTick()
  const el = kanbanRef.value?.querySelector<HTMLElement>(`.kanban-card[data-id="${hit.id}"]`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    searchHitId.value = hit.id
    setTimeout(() => { if (searchHitId.value === hit.id) searchHitId.value = null }, 2000)
  }
}

function closeSearchOnOutside(event: PointerEvent) {
  if (!showSearchResults.value) return
  const target = event.target as Node | null
  if (target && taskSearchRef.value?.contains(target)) return
  showSearchResults.value = false
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
  taskForm.value = { title: '', description: '', priority: 'medium', due_date: '', column_id: firstColumnId() }
}

// ── Data loading ──
async function loadFolders() {
  if (!authStore.authed) return
  try {
    folders.value = await api<BoardFolder[]>('/api/board-folders')
  } catch (e) {
    console.error('Failed to load board folders:', e)
    showError()
  }
}

async function loadBoards() {
  if (!authStore.authed) return
  try {
    boards.value = await api<Board[]>('/api/boards')
    ensureCurrentBoardInFolder()
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

function switchFolder(filter: FolderFilter) {
  currentFolderFilter.value = filter
  ensureCurrentBoardInFolder()
  if (currentBoardId.value) loadBoardData()
}

function onFolderFilterChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  switchFolder(value === 'all' || value === 'unfiled' ? value : Number(value))
}

function ensureCurrentBoardInFolder() {
  const list = visibleBoards.value
  if (list.some(board => board.id === currentBoardId.value)) return
  currentBoardId.value = list[0]?.id || 0
  if (!currentBoardId.value) {
    columns.value = []
    todos.value = []
  }
}

async function loadInitialData() {
  if (!authStore.authed) return
  await Promise.all([loadFolders(), loadBoards()])
  if (currentBoardId.value) await loadBoardData()
}

// ── Board CRUD ──
function defaultBoardFolderId() {
  return typeof currentFolderFilter.value === 'number' ? String(currentFolderFilter.value) : ''
}

function openBoardModal() {
  boardFormName.value = ''
  boardFormFolderId.value = defaultBoardFolderId()
  showBoardModal.value = true
}

async function addBoard() {
  if (!boardFormName.value.trim()) return
  await runPending('addBoard', async () => {
    const board = await api<Board>('/api/boards', {
      method: 'POST',
      body: JSON.stringify({
        name: boardFormName.value.trim(),
        folder_id: boardFormFolderId.value ? Number(boardFormFolderId.value) : null,
      }),
    })
    boards.value.push(board)
    showBoardModal.value = false
    boardFormName.value = ''
    boardFormFolderId.value = ''
    if (currentFolderFilter.value !== 'all' && !visibleBoards.value.some(item => item.id === board.id)) {
      switchFolder(board.folder_id ?? 'unfiled')
    }
    switchBoard(board.id)
  })
}

async function moveCurrentBoardToFolder(value: string) {
  const board = currentBoard.value
  if (!board) return
  const folderId = value ? Number(value) : null
  const oldFolderId = board.folder_id
  board.folder_id = folderId
  board.folder_name = folderId ? folders.value.find(folder => folder.id === folderId)?.name : ''
  try {
    const updated = await api<Board>(`/api/boards/${board.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ folder_id: folderId }),
    })
    Object.assign(board, updated)
    ensureCurrentBoardInFolder()
    if (currentBoardId.value !== board.id && currentBoardId.value) loadBoardData()
  } catch (e) {
    console.error('Failed to move board to folder:', e)
    board.folder_id = oldFolderId
    showError()
  }
}

function onCurrentBoardFolderChange(event: Event) {
  moveCurrentBoardToFolder((event.target as HTMLSelectElement).value)
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
    if (currentBoardId.value === id) {
      ensureCurrentBoardInFolder()
      if (currentBoardId.value) loadBoardData()
    }
  })
}

// ── Folder CRUD ──
function openFolderModal() {
  folderFormName.value = ''
  showFolderModal.value = true
}

async function addFolder() {
  if (!folderFormName.value.trim()) return
  await runPending('addFolder', async () => {
    const folder = await api<BoardFolder>('/api/board-folders', {
      method: 'POST',
      body: JSON.stringify({ name: folderFormName.value.trim() }),
    })
    folders.value.push(folder)
    showFolderModal.value = false
    folderFormName.value = ''
    switchFolder(folder.id)
  })
}

function openRenameFolderModal() {
  const folder = selectedFolder.value
  if (!folder) return
  folderRenameName.value = folder.name
  showRenameFolderModal.value = true
}

function openDeleteSelectedFolderModal() {
  const folder = selectedFolder.value
  if (!folder) return
  showDeleteFolderModal.value = folder.id
}

async function renameFolder() {
  const folder = selectedFolder.value
  if (!folder) return
  const id = folder.id
  const name = folderRenameName.value.trim()
  if (!name) return
  await runPending('renameFolder', async () => {
    const updated = await api<BoardFolder>(`/api/board-folders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    })
    const existing = folders.value.find(item => item.id === id)
    if (existing) Object.assign(existing, updated)
    boards.value = boards.value.map(board => board.folder_id === id ? { ...board, folder_name: updated.name } : board)
    showRenameFolderModal.value = false
    folderRenameName.value = ''
  })
}

async function doDeleteFolder() {
  const id = showDeleteFolderModal.value
  if (!id) return
  await runPending('deleteFolder', async () => {
    showDeleteFolderModal.value = null
    await api(`/api/board-folders/${id}`, { method: 'DELETE' })
    folders.value = folders.value.filter(folder => folder.id !== id)
    boards.value = boards.value.map(board => board.folder_id === id ? { ...board, folder_id: null, folder_name: '' } : board)
    if (currentFolderFilter.value === id) switchFolder('unfiled')
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
    due_date: item.due_date || '',
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
    due_date: taskForm.value.due_date || null,
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
      body: JSON.stringify({ content, author: '用户' }),
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

function openActivityModal(scope?: ActivityScope) {
  activityScope.value = scope ?? null
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
    if (activityScope.value) {
      if (activityScope.value.entity === 'column') {
        params.set('column_id', String(activityScope.value.id))
      } else {
        params.set('entity_type', activityScope.value.entity)
        params.set('entity_id', String(activityScope.value.id))
      }
    } else if (activityFilters.entity !== 'all') {
      params.set('entity_type', activityFilters.entity)
    }
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
  if (currentFolderFilter.value === 'all') return
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

  const ordered = visibleBoards.value.filter(b => b.id !== id).sort((a, b) => a.sort_order - b.sort_order)
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
  document.addEventListener('pointerdown', closeSearchOnOutside)
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
  document.removeEventListener('pointerdown', closeSearchOnOutside)
})
</script>

<style scoped src="./TodoPage.css"></style>
