import { useState } from 'react'
import { Sheet, Field } from './ui'
import { useStore, categoryById } from '../lib/store'
import { ArrowRight, Folder, Pencil, Trash } from './Icons'
import type { TestRecord } from '../lib/types'

export function useTestActions(onDeleted?: () => void) {
  const [target, setTarget] = useState<TestRecord | null>(null)
  const [mode, setMode] = useState<'menu' | 'rename' | 'move' | 'delete'>('menu')
  const [name, setName] = useState('')
  const categories = useStore((s) => s.categories)
  const attempts = useStore((s) => s.attempts)
  const renameTest = useStore((s) => s.renameTest)
  const moveTest = useStore((s) => s.moveTest)
  const deleteTest = useStore((s) => s.deleteTest)
  const toast = useStore((s) => s.toast)

  const open = (test: TestRecord) => {
    setTarget(test)
    setName(test.name)
    setMode('menu')
  }
  const close = () => setTarget(null)

  const attemptCount = target ? attempts.filter((a) => a.testId === target.id).length : 0
  const currentCategory = target ? categoryById(categories, target.categoryId) : null

  const sheet = (
    <>
      <Sheet
        open={!!target && mode === 'menu'}
        onClose={close}
        title={target?.name}
        desc={target ? `${target.questionCount} questions · ${currentCategory?.name}${attemptCount ? ` · ${attemptCount} attempt${attemptCount > 1 ? 's' : ''}` : ''}` : ''}
      >
        <button className="btn btn--secondary btn--block" style={{ justifyContent: 'flex-start' }} onClick={() => setMode('rename')}>
          <Pencil style={{ width: 18, height: 18 }} /> Rename
        </button>
        <button className="btn btn--secondary btn--block" style={{ justifyContent: 'flex-start' }} onClick={() => setMode('move')}>
          <Folder style={{ width: 18, height: 18 }} /> Move to category
        </button>
        <button className="btn btn--danger btn--block" style={{ justifyContent: 'flex-start' }} onClick={() => setMode('delete')}>
          <Trash style={{ width: 18, height: 18 }} /> Delete test
        </button>
      </Sheet>

      <Sheet open={!!target && mode === 'rename'} onClose={() => setMode('menu')} title="Rename test">
        <Field label="Test name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn--soft grow" onClick={() => setMode('menu')}>
            Cancel
          </button>
          <button
            className="btn btn--primary grow"
            onClick={() => {
              if (target && name.trim()) {
                renameTest(target.id, name)
                toast('Test renamed', 'success')
                close()
              }
            }}
          >
            Save
          </button>
        </div>
      </Sheet>

      <Sheet open={!!target && mode === 'move'} onClose={() => setMode('menu')} title="Move to category">
        <div className="stack gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              className="list-row"
              style={{
                padding: '12px 14px',
                borderColor: target?.categoryId === c.id ? 'var(--primary)' : 'var(--line)',
                background: target?.categoryId === c.id ? 'var(--primary-soft)' : 'var(--surface)',
              }}
              onClick={() => {
                if (target) {
                  moveTest(target.id, c.id)
                  toast(`Moved to ${c.name}`, 'success')
                  close()
                }
              }}
            >
              <span className="dot" style={{ background: c.color }} />
              <span className="grow" style={{ fontWeight: 600, fontSize: 15 }}>
                {c.name}
              </span>
              {target?.categoryId === c.id && <span className="label">Current</span>}
              <ArrowRight style={{ width: 16, height: 16, opacity: 0.5 }} />
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={!!target && mode === 'delete'} onClose={() => setMode('menu')} title="Delete this test?">
        <p className="sheet__desc" style={{ marginTop: 0 }}>
          <b>{target?.name}</b> will be removed from your library.
          {attemptCount > 0
            ? ` ${attemptCount} attempt${attemptCount > 1 ? 's' : ''} will stay in History, labelled as a deleted test.`
            : ' This cannot be undone.'}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn--soft grow" onClick={() => setMode('menu')}>
            Keep it
          </button>
          <button
            className="btn btn--danger grow"
            onClick={() => {
              if (target) {
                deleteTest(target.id)
                toast('Test deleted')
                close()
                onDeleted?.()
              }
            }}
          >
            Delete
          </button>
        </div>
      </Sheet>
    </>
  )

  return { open, sheet, target }
}
