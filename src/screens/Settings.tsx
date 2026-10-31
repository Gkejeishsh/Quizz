import { useRef, useState } from 'react'
import { useStore, applyTheme } from '../lib/store'
import { Page, Sheet, Segmented, Switch } from '../components/ui'
import { Download, Upload, Trash, Info, ShieldCheck } from '../components/Icons'
import type { PersistedState } from '../lib/types'
import { clearState } from '../lib/storage'

const APP_VERSION = '0.5.0'

export function SettingsScreen() {
  const settings = useStore((s) => s.settings)
  const setSetting = useStore((s) => s.setSetting)
  const toast = useStore((s) => s.toast)
  const pop = useStore((s) => s.pop)
  const tests = useStore((s) => s.tests)
  const attempts = useStore((s) => s.attempts)
  const categories = useStore((s) => s.categories)
  const drafts = useStore((s) => s.drafts)

  const [resetOpen, setResetOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const importRef = useRef<HTMLInputElement | null>(null)

  const bytes = new Blob([JSON.stringify({ tests, attempts, categories, drafts })]).size
  const sizeLabel = bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

  const exportBackup = () => {
    const data: PersistedState = {
      schemaVersion: 1,
      settings,
      categories,
      tests,
      attempts,
      drafts,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `quizz-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    toast('Backup exported', 'success')
  }

  const importBackup = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as PersistedState
      if (!parsed || !Array.isArray(parsed.tests) || !Array.isArray(parsed.categories)) {
        toast('That file is not a Quizz backup', 'error')
        return
      }
      useStore.getState().restoreSnapshot(parsed)
      toast('Backup restored', 'success')
    } catch {
      toast('Could not read that backup', 'error')
    }
  }

  return (
    <Page title="Settings" back={pop}>
      <div className="stack gap-4" style={{ marginTop: 4 }}>
        <div>
          <div className="label" style={{ marginBottom: 8 }}>Appearance</div>
          <div className="card stack gap-4">
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Theme</div>
              <Segmented
                value={settings.theme}
                onChange={(v) => {
                  setSetting('theme', v)
                  applyTheme(v)
                }}
                options={[
                  { value: 'system', label: 'System' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
              />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Text size</div>
              <Segmented
                value={settings.fontScale}
                onChange={(v) => setSetting('fontScale', v)}
                options={[
                  { value: 'sm', label: 'Small' },
                  { value: 'md', label: 'Default' },
                  { value: 'lg', label: 'Large' },
                ]}
              />
            </div>
            <div className="inset-row">
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>Haptics</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>Subtle feedback on taps</div>
              </div>
              <Switch on={settings.haptics} onChange={(v) => setSetting('haptics', v)} label="Haptics" />
            </div>
            <div className="inset-row">
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>Sound</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>Quiet tick when you pick an answer</div>
              </div>
              <Switch on={settings.sound} onChange={(v) => setSetting('sound', v)} label="Sound" />
            </div>
            <div className="inset-row">
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>Reduce motion</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>Fewer animations, no confetti</div>
              </div>
              <Switch on={settings.reduceMotion} onChange={(v) => setSetting('reduceMotion', v)} label="Reduce motion" />
            </div>
          </div>
        </div>

        <div>
          <div className="label" style={{ marginBottom: 8 }}>Your data</div>
          <div className="card stack gap-2">
            <button className="list-row" style={{ background: 'transparent', border: 0, padding: '10px 0' }} onClick={exportBackup}>
              <Download style={{ width: 19, height: 19, color: 'var(--primary)' }} />
              <span className="grow" style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600 }}>Export backup</span>
                <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Tests, categories, attempts and settings</span>
              </span>
            </button>
            <div className="divider" />
            <button className="list-row" style={{ background: 'transparent', border: 0, padding: '10px 0' }} onClick={() => importRef.current?.click()}>
              <Upload style={{ width: 19, height: 19, color: 'var(--primary)' }} />
              <span className="grow" style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600 }}>Restore backup</span>
                <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Replaces current data with the backup</span>
              </span>
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void importBackup(f)
                e.currentTarget.value = ''
              }}
            />
            <div className="divider" />
            <div className="row-between" style={{ padding: '6px 0' }}>
              <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>Storage used</span>
              <span className="mono" style={{ fontSize: 13, color: 'var(--ink-2)' }}>{sizeLabel}</span>
            </div>
          </div>
          <p className="subtitle" style={{ fontSize: 12, marginTop: 8, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <ShieldCheck style={{ width: 14, height: 14, flex: 'none', marginTop: 2, color: 'var(--success)' }} />
            Everything lives on this device. No account, no cloud, no tracking.
          </p>
        </div>

        <div>
          <div className="label" style={{ marginBottom: 8 }}>About</div>
          <div className="card stack gap-2">
            <button className="list-row" style={{ background: 'transparent', border: 0, padding: '10px 0' }} onClick={() => setAboutOpen(true)}>
              <Info style={{ width: 19, height: 19, color: 'var(--primary)' }} />
              <span className="grow" style={{ textAlign: 'left', fontSize: 14.5, fontWeight: 600 }}>About Quizz</span>
              <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{APP_VERSION}</span>
            </button>
            <div className="divider" />
            <button className="list-row" style={{ background: 'transparent', border: 0, padding: '10px 0' }} onClick={() => setResetOpen(true)}>
              <Trash style={{ width: 19, height: 19, color: 'var(--danger)' }} />
              <span className="grow" style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: 'var(--danger)' }}>Delete all data</span>
                <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Removes every test, attempt and setting</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} title="Delete all data?">
        <p className="sheet__desc" style={{ marginTop: 0 }}>
          This removes {tests.length} test{tests.length === 1 ? '' : 's'}, {attempts.length} attempt{attempts.length === 1 ? '' : 's'} and every category.
          Export a backup first if you might want them back.
        </p>
        <button
          className="btn btn--danger btn--block"
          onClick={async () => {
            await clearState()
            localStorage.removeItem('quizz.settings')
            window.location.reload()
          }}
        >
          Yes, delete everything
        </button>
        <button className="btn btn--soft btn--block" onClick={() => setResetOpen(false)}>
          Cancel
        </button>
      </Sheet>

      <Sheet open={aboutOpen} onClose={() => setAboutOpen(false)} title="Quizz" desc={`Version ${APP_VERSION} · offline quiz player`}>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>
          Quizz plays tests generated from your own PDFs. Files use the <b>.quizz</b> format (version 1): a plain JSON pack with
          questions, answer keys and explanations. Nothing is generated inside the app and nothing leaves your phone.
        </p>
        <div className="divider" />
        <div className="row-between" style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
          <span>Pack format</span>
          <span className="mono">quizz-pack v1</span>
        </div>
        <div className="row-between" style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
          <span>Typefaces</span>
          <span>Bricolage Grotesque · Plus Jakarta Sans</span>
        </div>
        <button className="btn btn--soft btn--block" onClick={() => setAboutOpen(false)}>
          Close
        </button>
      </Sheet>
    </Page>
  )
}
