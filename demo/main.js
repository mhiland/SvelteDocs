import { mount } from 'svelte'
import Docs from '../src/index.js'
import '../src/styles/docs.css'

// Minimal host CSS variables so the demo looks reasonable standalone (the real
// host — dependably-www — already defines these).
const css = `:root{--bg:#fff;--bg2:#f5f5f5;--bg3:#e8e8e8;--border:#d0d0d0;--text:#1a1a1a;--text2:#555;--accent:#2563eb;--accent-hover:#1d4ed8;--accent-soft:#e8eefc;--radius:6px}
[data-theme=dark]{--bg:#0f1115;--bg2:#1a1d23;--bg3:#252a32;--border:#333a44;--text:#e6e6e6;--text2:#9aa4b2;--accent:#60a5fa;--accent-hover:#93c5fd;--accent-soft:#1e2a3f}
body{margin:0}`
const style = document.createElement('style')
style.textContent = css
document.head.appendChild(style)

mount(Docs, {
  target: document.getElementById('app'),
  props: {
    basePath: '/docs',
    manifestUrl: '/docs-content/manifest.json',
    contentBaseUrl: '/docs-content',
    locale: 'en',
    fallbackLocale: 'en',
    locales: [
      { code: 'en', label: 'English' },
      { code: 'fr', label: 'Français' },
    ],
    onLocaleChange: (c) => console.log('locale →', c),
  },
})
