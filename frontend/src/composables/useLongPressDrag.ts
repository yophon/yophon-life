// Long-press gating for pointer drags on touch / coarse pointers. A drag is
// only allowed to start after the pointer is held still for LONG_PRESS_DELAY_MS;
// moving beyond LONG_PRESS_MOVE_TOLERANCE before that cancels it. On mouse /
// fine pointers no long-press is required. These helpers are pure: they operate
// on a passed-in LongPressDrag state object and hold no component state.

export const LONG_PRESS_DELAY_MS = 550
export const LONG_PRESS_MOVE_TOLERANCE = 10

export type LongPressMode = 'idle' | 'waiting' | 'ready' | 'cancelled'

export type LongPressDrag = {
  timer: number | null
  pointerId: number | null
  startX: number
  startY: number
  required: boolean
  mode: LongPressMode
}

export function createLongPressDrag(): LongPressDrag {
  return {
    timer: null,
    pointerId: null,
    startX: 0,
    startY: 0,
    required: false,
    mode: 'idle',
  }
}

export function shouldRequireLongPress(e: PointerEvent) {
  if (e.pointerType === 'touch' || e.pointerType === 'pen') return true
  return window.matchMedia?.('(pointer: coarse)').matches ?? false
}

export function beginLongPressDrag(state: LongPressDrag, e: PointerEvent) {
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

export function resetLongPressDrag(state: LongPressDrag) {
  if (state.timer) window.clearTimeout(state.timer)
  state.timer = null
  state.pointerId = null
  state.required = false
  state.mode = 'idle'
}

export function longPressBlocksDrag(state: LongPressDrag, e: PointerEvent) {
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
