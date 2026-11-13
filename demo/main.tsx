import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '../src/styles/index.less'
import './demo.less'

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
