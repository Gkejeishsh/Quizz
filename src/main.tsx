import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/plus-jakarta-sans'
// Urdu / Arabic script — bundled so Urdu tests render identically offline
import '@fontsource-variable/noto-sans-arabic'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/600.css'
import 'katex/dist/katex.min.css'

import './styles/tokens.css'
import './styles/base.css'

import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Offline shell for the installable web build. Skipped in dev so hot reload
// never serves a stale asset.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline support is a bonus, not a requirement */
    })
  })
}
