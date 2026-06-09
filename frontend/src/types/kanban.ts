// Shared kanban/todo domain types, extracted from TodoPage.vue.

export interface TodoItem {
  id: number; title: string; description: string
  priority: string; status: string
  board_id: number; column_id: number; sort_order: number
}

export interface TodoComment {
  id: number
  todo_id: number
  author: string
  content: string
  created_at: number
  updated_at: number
}

export interface Board {
  id: number
  name: string
  folder_id: number | null
  folder_name?: string
  sort_order: number
}

export interface BoardFolder { id: number; name: string; sort_order: number }

export interface Column {
  id: number
  board_id: number
  name: string
  sort_order: number
  row_index?: number
  collapsed?: number
  width?: number | null
}

export interface KanbanActivity {
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

export type ActivityScope = {
  entity: 'column' | 'todo'
  id: number
  title: string
}
