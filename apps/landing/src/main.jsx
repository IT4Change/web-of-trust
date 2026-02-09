import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { LanguageProvider } from './i18n/LanguageContext'
import { AudienceProvider } from './audience'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AudienceProvider>
          <App />
        </AudienceProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
