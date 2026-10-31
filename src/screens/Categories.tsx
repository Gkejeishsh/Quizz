import { useState } from 'react'
import { useStore } from '../lib/store'
import { Page, Sheet, Field } from '../components/ui'
import { Dots, FolderPlus, Plus, Trash, Pencil, CheckCircle } from '../components/Icons'
import type { Category } from '../lib/types'
import { haptic } from '../lib/haptics'

export function CategoriesScreen() {
  const categories = useStore((s) => s.categories)
  const tests = useStore((s) => s.tests)
  const addCategory = useStore((s) => s.addCategory)
  const renameCategory = useStore((s) => s.renameCategory)
  const deleteCategory = useStore((s) => s.deleteCategory)
  const pop = useStore((s) => s.pop)
  const toast = useStore((s) => s.toast)

  const [target, setTarget] = useState<Category | null>(null)
  const [mode, setMode] = useState<'menu' | 'rename' | 'delete' | 'new'>('menu')
  const [name, setName] = useState('')

  const count = (id: string) => tests.filter((t) => t.categoryId === id).length

  return (
    <>
      <Page
        title="Categories"
        subtitle="Organise your saved tests"
        back={pop}
        right={
          <button
            className="icon-btn icon-btn--bordered"
            aria-label="New category"
            onClick={() => {
              setMode('new')
              setName('')
            }}
          >
            <Plus />
          </button>
        }
      >
        <div className="stack gap-2" style={{ marginTop: 4 }}>
          {categories.map((c) => (
            <div key={c.id} className="list-row" style={{ padding: '0 6px 0 16px' }}>
              <span className="dot" style={{ background: c.color, width: 10, height: 10 }} />
              <div className="grow" style={{ paddingBlock: 14 }}>
                <div style={{ fontSize: 15.5, fontWeight: 650 }}>{c.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>
                  {count(c.id)} test{count(c.id) === 1 ? '' : 's'}
                  {c.locked ? ' · built in' : ''}
                </div>
              </div>
              {c.locked ? (
                <span className="badge" style={{ marginRight: 8 }}>default</span>
              ) : (
                <button
                  className="icon-btn"
                  onClick={() => {
                    setTarget(c)
                    setName(c.name)
                    setMode('menu')
                  }}
                  aria-label={`Actions for ${c.name}`}
                >
                  <Dots />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          className="btn btn--soft btn--block"
          style={{ marginTop: 18 }}
          onClick={() => {
            setMode('new')
            setName('')
          }}
        >
          <FolderPlus /> New category
        </button>

        <p className="subtitle" style={{ fontSize: 12.5, marginTop: 16, textAlign: 'center' }}>
          Deleting a category never deletes tests — they move to Uncategorized.
        </p>
      </Page>

      <Sheet open={!!target && mode === 'menu'} onClose={() => setTarget(null)} title={target?.name} desc={`${target ? count(target.id) : 0} saved tests`}>
        <button
          className="btn btn--secondary btn--block"
          style={{ justifyContent: 'flex-start' }}
          onClick={() => setMode('rename')}
        >
          <Pencil style={{ width: 18, height: 18 }} /> Rename category
        </button>
        <button className="btn btn--danger btn--block" style={{ justifyContent: 'flex-start' }} onClick={() => setMode('delete')}>
          <Trash style={{ width: 18, height: 18 }} /> Delete category
        </button>
      </Sheet>

      <Sheet open={!!target && mode === 'rename'} onClose={() => setMode('menu')} title="Rename category">
        <Field label="Name">
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
                renameCategory(target.id, name)
                toast('Category renamed', 'success')
                setTarget(null)
              }
            }}
          >
            Save
          </button>
        </div>
      </Sheet>

      <Sheet
        open={!!target && mode === 'delete'}
        onClose={() => setMode('menu')}
        title="Delete category?"
        desc={
          target && count(target.id) > 0
            ? `${count(target.id)} test${count(target.id) > 1 ? 's' : ''} will move to Uncategorized. Nothing is deleted.`
            : 'This category is empty.'
        }
      >
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn--soft grow" onClick={() => setMode('menu')}>
            Keep it
          </button>
          <button
            className="btn btn--danger grow"
            onClick={() => {
              if (target) {
                deleteCategory(target.id)
                haptic('medium')
                toast('Category deleted')
                setTarget(null)
              }
            }}
          >
            Delete
          </button>
        </div>
      </Sheet>

      <Sheet open={mode === 'new'} onClose={() => setMode('menu')} title="New category">
        <Field label="Name">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Computer Science"
            autoFocus
          />
        </Field>
        <button
          className="btn btn--primary btn--block"
          onClick={() => {
            if (!name.trim()) return
            const c = addCategory(name)
            haptic('success')
            toast(`“${c.name}” added`, 'success')
            setName('')
            setMode('menu')
          }}
        >
          <CheckCircle style={{ width: 17, height: 17 }} /> Create
        </button>
      </Sheet>
    </>
  )
}
