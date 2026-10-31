import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useStore } from '../lib/store'
import { validatePack, packToReport, type ValidationResult } from '../lib/pack'
import { DEMO_PACKS, DEMO_PACK_FILES } from '../data/demoPacks'
import { Page, Sheet, Field, Segmented } from '../components/ui'
import { AlertCircle, CheckCircle, Download, FileText, FolderPlus, Info, Plus, Upload } from '../components/Icons'
import { cn } from '../lib/cn'
import { haptic } from '../lib/haptics'
import type { Pack } from '../lib/types'

export function ImportScreen() {
  const push = useStore((s) => s.push)
  const pop = useStore((s) => s.pop)
  const tests = useStore((s) => s.tests)
  const categories = useStore((s) => s.categories)
  const savePack = useStore((s) => s.savePack)
  const addCategory = useStore((s) => s.addCategory)
  const toast = useStore((s) => s.toast)

  const [tab, setTab] = useState<'file' | 'library'>('file')
  const [dragging, setDragging] = useState(false)
  const [pending, setPending] = useState<Pack | null>(null)
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [saveOpen, setSaveOpen] = useState(false)
  const [errorResult, setErrorResult] = useState<ValidationResult | null>(null)
  const [duplicate, setDuplicate] = useState<{ pack: Pack; existingName: string } | null>(null)
  const [pendingWarnings, setPendingWarnings] = useState<string[]>([])
  const [newCatOpen, setNewCatOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  const openSave = (pack: Pack, warnings: string[] = []) => {
    setPending(pack)
    setPendingWarnings(warnings)
    setName(pack.title)
    const match = categories.find((c) => c.name.toLowerCase() === (pack.subject ?? '').toLowerCase())
    setCategoryId(match?.id ?? categories.find((c) => !c.locked)?.id ?? categories[0].id)
    setSaveOpen(true)
  }

  const handleFile = async (file: File) => {
    if (!file) return
    haptic('light')
    if (file.size > 12 * 1024 * 1024) {
      setErrorResult({
        ok: false,
        issues: [{ level: 'error', message: `This file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Quizz files must be under 12 MB.` }],
      })
      return
    }
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const result = validatePack(json, file.size)
      if (!result.ok || !result.pack) {
        setErrorResult(result)
        return
      }
      openSave(
        result.pack,
        result.issues.filter((i) => i.level === 'warning').map((i) => i.message),
      )
    } catch {
      setErrorResult({
        ok: false,
        issues: [{ level: 'error', message: 'This file could not be read. It may not be a .quizz file, or it may be damaged.' }],
      })
    }
  }

  const existingFor = (pack: Pack) => tests.find((t) => t.packId === pack.id)

  const commitSave = (pack: Pack, opts?: { copy?: boolean }) => {
    const existing = existingFor(pack)
    if (existing && !opts?.copy) {
      setDuplicate({ pack, existingName: existing.name })
      return
    }
    const test = savePack(pack, { name, categoryId })
    setSaveOpen(false)
    setPending(null)
    haptic('success')
    toast('Test saved', 'success')
    pop()
    push({ name: 'test', testId: test.id })
  }

  const replaceExisting = () => {
    if (!duplicate) return
    const existing = existingFor(duplicate.pack)
    if (existing) {
      useStore.getState().deleteTest(existing.id)
    }
    setDuplicate(null)
    commitSave(duplicate.pack, { copy: true })
  }

  const issueCount = errorResult?.issues.filter((i) => i.level === 'error').length ?? 0
  const warnCount = errorResult?.issues.filter((i) => i.level === 'warning').length ?? 0

  return (
    <Page title="Add new test" back={pop} subtitle="Import a file or pick one from the library">
      <div style={{ marginTop: 8, marginBottom: 20 }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'file', label: 'Upload file' },
            { value: 'library', label: 'Library' },
          ]}
        />
      </div>

      {tab === 'file' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              const f = e.dataTransfer.files?.[0]
              if (f) void handleFile(f)
            }}
            style={{
              border: `1.5px dashed ${dragging ? 'var(--primary)' : 'var(--line-strong)'}`,
              background: dragging ? 'var(--primary-soft)' : 'var(--surface)',
              borderRadius: 'var(--r-lg)',
              padding: '34px 22px',
              textAlign: 'center',
              transition: 'border-color .15s, background .15s',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 18,
                background: 'var(--primary-soft)',
                color: 'var(--primary)',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 14px',
              }}
            >
              <Upload style={{ width: 26, height: 26 }} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
              Choose a .quizz file
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 5, lineHeight: 1.5 }}>
              Tap to browse your files, or drop it here.
              <br />
              Everything is stored on this device.
            </p>
            <span className="pill-btn" style={{ marginTop: 16, background: 'var(--ink)', color: 'var(--bg)', borderColor: 'transparent' }}>
              <FileText /> Browse files
            </span>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".quizz,.json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
              e.currentTarget.value = ''
            }}
          />

          <div className="card" style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Info style={{ width: 18, height: 18, color: 'var(--primary)', flex: 'none', marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 650 }}>Send me a test PDF</div>
              <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, marginTop: 3 }}>
                I convert it into a .quizz file with the questions, answer key and explanations — then you import it here.
                The test keeps working even if you delete the original file.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {tab === 'library' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="stack gap-3">
          <div className="label">Included packs</div>
          {DEMO_PACKS.map((pack) => {
            const existing = existingFor(pack)
            return (
              <div key={pack.id} className="list-row" style={{ padding: 0 }}>
                <button
                  onClick={() => (existing ? push({ name: 'test', testId: existing.id }) : openSave(pack, []))}
                  style={{ flex: 1, minWidth: 0, textAlign: 'left', padding: '14px 16px', display: 'flex', gap: 13, alignItems: 'center' }}
                >
                  <span
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 13,
                      flex: 'none',
                      display: 'grid',
                      placeItems: 'center',
                      background: 'var(--primary-soft)',
                      color: 'var(--primary)',
                    }}
                  >
                    <FileText style={{ width: 20, height: 20 }} />
                  </span>
                  <span className="list-row__main">
                    <span className="list-row__title" style={{ display: 'block' }}>
                      {pack.title}
                    </span>
                    <span className="list-row__meta">
                      {pack.subject} <span className="sep">·</span> {pack.questions.length} questions
                      {pack.questions.every((q) => q.explanation) && (
                        <>
                          <span className="sep">·</span> explanations
                        </>
                      )}
                    </span>
                  </span>
                  <span className={cn('badge', existing ? 'badge--good' : 'badge--brand')}>
                    {existing ? <CheckCircle /> : <Plus />}
                    {existing ? 'Saved' : 'Add'}
                  </span>
                </button>
                {(() => {
                  const file = DEMO_PACK_FILES.find((f) => f.id === pack.id)
                  if (!file) return null
                  return (
                    <a
                      href={file.url}
                      download={file.fileName}
                      aria-label={`Download ${file.fileName}`}
                      title="Download this .quizz file"
                      className="icon-btn"
                      style={{ marginRight: 6, textDecoration: 'none', color: 'var(--ink-3)' }}
                    >
                      <Download />
                    </a>
                  )
                })()}
              </div>
            )
          })}
          <p className="subtitle" style={{ fontSize: 12.5, marginTop: 4 }}>
            New packs you ask me to build will appear here in future updates. You can also import any .quizz file from the Upload tab.
          </p>
        </motion.div>
      )}

      {/* save sheet */}
      <Sheet
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Save test"
        desc={pending ? `${pending.questions.length} questions · ${pending.questions.filter((q) => q.explanation).length} with explanations` : ''}
      >
        {pendingWarnings.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 9,
              alignItems: 'flex-start',
              padding: '10px 12px',
              borderRadius: 'var(--r-xs)',
              background: 'var(--warning-soft)',
              color: 'var(--warning)',
              fontSize: 12.5,
              lineHeight: 1.5,
            }}
          >
            <AlertCircle style={{ width: 16, height: 16, flex: 'none', marginTop: 1 }} />
            <span>
              {pendingWarnings.length} warning{pendingWarnings.length > 1 ? 's' : ''}: {pendingWarnings.slice(0, 2).join(' · ')}
              {pendingWarnings.length > 2 ? ' …' : ''}
            </span>
          </div>
        )}
        <Field label="Test name">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Chemistry — Chapter 3"
            autoFocus
          />
        </Field>
        <div>
          <div className="field__label" style={{ marginBottom: 8 }}>Category</div>
          <div className="chip-scroll" style={{ marginInline: 0, paddingInline: 0 }}>
            {categories
              .filter((c) => !c.locked)
              .map((c) => (
                <button
                  key={c.id}
                  className={cn('chip', categoryId === c.id && 'chip--active')}
                  onClick={() => setCategoryId(c.id)}
                >
                  <span className="chip__dot" style={{ background: c.color }} />
                  {c.name}
                </button>
              ))}
            <button className="chip" onClick={() => setNewCatOpen(true)}>
              <FolderPlus style={{ width: 15, height: 15 }} /> New
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn--soft grow" onClick={() => setSaveOpen(false)}>
            Cancel
          </button>
          <button
            className="btn btn--primary grow"
            onClick={() => pending && commitSave(pending)}
            disabled={!pending}
          >
            Save test
          </button>
        </div>
      </Sheet>

      {/* errors */}
      <Sheet open={!!errorResult} onClose={() => setErrorResult(null)} title="This file can’t be imported">
        <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
          <AlertCircle style={{ width: 20, height: 20, color: 'var(--danger)', flex: 'none', marginTop: 2 }} />
          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            {issueCount} problem{issueCount === 1 ? '' : 's'} found{warnCount ? ` and ${warnCount} warning${warnCount === 1 ? '' : 's'}` : ''}.
            Nothing was saved. Send me this report and I’ll rebuild the file.
          </p>
        </div>
        <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {errorResult?.issues.map((issue, i) => (
            <div
              key={i}
              style={{
                fontSize: 13,
                lineHeight: 1.5,
                padding: '10px 12px',
                borderRadius: 10,
                background: issue.level === 'error' ? 'var(--danger-soft)' : 'var(--warning-soft)',
                color: issue.level === 'error' ? 'var(--danger)' : 'var(--warning)',
              }}
            >
              {issue.level === 'error' ? 'Error' : 'Warning'}
              {issue.n ? ` · Q${issue.n}` : ''}: {issue.message}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn--soft grow"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(errorResult ? packToReport(errorResult) : '')
                toast('Report copied', 'success')
              } catch {
                toast('Could not copy', 'error')
              }
            }}
          >
            Copy report
          </button>
          <button className="btn btn--primary grow" onClick={() => setErrorResult(null)}>
            Close
          </button>
        </div>
      </Sheet>

      {/* duplicates */}
      <Sheet open={!!duplicate} onClose={() => setDuplicate(null)} title="Already saved">
        <p className="sheet__desc" style={{ marginTop: 0 }}>
          You already have this test saved as <b>{duplicate?.existingName}</b>. What would you like to do?
        </p>
        <button
          className="btn btn--secondary btn--block"
          onClick={() => {
            const existing = duplicate ? existingFor(duplicate.pack) : undefined
            setDuplicate(null)
            setSaveOpen(false)
            if (existing) push({ name: 'test', testId: existing.id })
          }}
        >
          Open the saved test
        </button>
        <button className="btn btn--primary btn--block" onClick={replaceExisting}>
          Replace it with this file
        </button>
        <button
          className="btn btn--ghost btn--block"
          onClick={() => {
            if (duplicate) commitSave(duplicate.pack, { copy: true })
            setDuplicate(null)
          }}
        >
          Save as a separate copy
        </button>
      </Sheet>

      {/* new category */}
      <Sheet open={newCatOpen} onClose={() => setNewCatOpen(false)} title="New category">
        <Field label="Name">
          <input
            className="input"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="e.g. Pakistan Studies"
            autoFocus
          />
        </Field>
        <button
          className="btn btn--primary btn--block"
          onClick={() => {
            if (!newCatName.trim()) return
            const cat = addCategory(newCatName)
            setCategoryId(cat.id)
            setNewCatName('')
            setNewCatOpen(false)
            toast(`Category “${cat.name}” added`, 'success')
          }}
        >
          Add category
        </button>
      </Sheet>
    </Page>
  )
}
