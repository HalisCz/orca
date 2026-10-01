import type { StateCreator } from 'zustand'
import type { AppState } from '../types'
import type {
  TodoistConnectResult,
  TodoistConnectionStatus
} from '../../../../shared/todoist-types'
import { getProviderRuntimeContextKey } from '@/lib/provider-runtime-context'

export type TodoistSlice = {
  todoistStatus: TodoistConnectionStatus
  todoistStatusChecked: boolean
  todoistStatusContextKey: string | null
  checkTodoistConnection: () => Promise<void>
  connectTodoist: (args: { apiToken: string }) => Promise<TodoistConnectResult>
  disconnectTodoist: () => Promise<void>
}

const DISCONNECTED: TodoistConnectionStatus = { connected: false, viewer: null }

// Why: Todoist runs only through the local main process (no remote-runtime RPC
// yet), but readiness readers compare against the provider runtime context key.
export const createTodoistSlice: StateCreator<AppState, [], [], TodoistSlice> = (set, get) => ({
  todoistStatus: DISCONNECTED,
  todoistStatusChecked: false,
  todoistStatusContextKey: null,

  checkTodoistConnection: async () => {
    const contextKey = getProviderRuntimeContextKey(get().settings)
    let status = DISCONNECTED
    try {
      status = await window.api.todoist.status()
    } catch {
      // Why: a failed status read must still settle readiness as disconnected.
    }
    if (getProviderRuntimeContextKey(get().settings) !== contextKey) {
      return
    }
    set({
      todoistStatus: status,
      todoistStatusChecked: true,
      todoistStatusContextKey: contextKey
    })
  },

  connectTodoist: async (args) => {
    try {
      const result = await window.api.todoist.connect(args)
      if (result.ok) {
        set({
          todoistStatus: { connected: true, viewer: result.viewer },
          todoistStatusChecked: true,
          todoistStatusContextKey: getProviderRuntimeContextKey(get().settings)
        })
      }
      return result
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Connection failed' }
    }
  },

  disconnectTodoist: async () => {
    await window.api.todoist.disconnect()
    set({
      todoistStatus: DISCONNECTED,
      todoistStatusChecked: true,
      todoistStatusContextKey: getProviderRuntimeContextKey(get().settings)
    })
  }
})
