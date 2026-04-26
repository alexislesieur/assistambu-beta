import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Récupère le token depuis l'URL AVANT que React monte
const params = new URLSearchParams(window.location.search)
const tokenFromUrl = params.get('token')
if (tokenFromUrl) {
  localStorage.setItem('token', tokenFromUrl)
  window.history.replaceState({}, '', window.location.pathname)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)