/**
 * Sheet/overlay bookkeeping shared between the UI and the native back handler.
 * Kept in its own module so `lib/native.ts` can read it without importing the
 * component tree (which would create an import cycle).
 */
export const sheetRegistry = { open: 0 }
export const CLOSE_SHEET_EVENT = 'quizz:close-sheet'
export const EXIT_REQUEST_EVENT = 'quizz:exit-request'
