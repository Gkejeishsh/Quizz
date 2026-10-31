import { createStore, del, get, set } from 'idb-keyval'
import type { PersistedState } from './types'

const KEY = 'quizz.state.v1'
const LOCAL_KEY = 'quizz.state.v1'
let idb: ReturnType<typeof createStore> | null = null

function idbStore() {
  if (!idb) {
    try {
      idb = createStore('quizz-db', 'state')
    } catch {
      idb = null
    }
  }
  return idb
}

export async function loadState(): Promise<PersistedState | null> {
  try {
    const s = idbStore()
    if (s) {
      const value = await get<PersistedState>(KEY, s)
      if (value) return value
    }
  } catch {
    /* fall through to localStorage */
  }
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as PersistedState) : null
  } catch {
    return null
  }
}

export async function saveState(state: PersistedState): Promise<void> {
  // keep a tiny copy in localStorage for the pre-paint theme script
  try {
    localStorage.setItem('quizz.settings', JSON.stringify(state.settings))
  } catch {
    /* ignore */
  }
  try {
    const s = idbStore()
    if (s) {
      await set(KEY, state, s)
      return
    }
  } catch {
    /* fall through */
  }
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state))
  } catch {
    /* last resort: nothing we can do, surfaced by caller if needed */
  }
}

export async function clearState(): Promise<void> {
  try {
    const s = idbStore()
    if (s) await del(KEY, s)
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(LOCAL_KEY)
    localStorage.removeItem('quizz.settings')
  } catch {
    /* ignore */
  }
}
