import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { capturarPromptDeInstalacao } from './features/onboarding/installPrompt'
import App from './App'

// O Android dispara o evento cedo; precisa ser capturado antes do React montar.
capturarPromptDeInstalacao()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
