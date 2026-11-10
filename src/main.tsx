import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App.tsx'
import { GlossaryDefinitions } from './ui/components/Term.tsx'
import './ui/styles/tokens.css'
import './ui/styles/base.css'
import './ui/styles/glossary.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root introuvable')

createRoot(root).render(
  <StrictMode>
    <App />
    {/* Hors de App : présentes quel que soit l'écran, pour que chaque terme
        marqué ait toujours sa définition à annoncer. */}
    <GlossaryDefinitions />
  </StrictMode>,
)
