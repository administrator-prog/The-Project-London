import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { BagProvider } from '@/lib/bag'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <BagProvider>
        <App />
      </BagProvider>
    </BrowserRouter>
  </StrictMode>,
)
