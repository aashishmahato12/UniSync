import React from 'react'
import ReactDOM from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import App from './App'
import './styles.css'
import './styles/globals.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/redesign.css'
import './styles/blue-accent.css'
import './styles/dark-mode.css'
import './styles/figma-mobile.css'
import './styles/desktop-theme.css'
import './styles/page-scale.css'
import './styles/click-jello.css'
import './styles/notification-popover.css'
import './styles/mobile-liquid-nav.css'

ReactDOM.createRoot(
  document.getElementById('root')!
).render(
  <React.StrictMode>
    <App />
    <Analytics beforeSend={event => {
      // Login callbacks can carry temporary credentials in the URL.
      const url = new URL(event.url)
      return { ...event, url: `${url.origin}${url.pathname}` }
    }} />
    <SpeedInsights beforeSend={event => {
      // Performance events can include the current URL, including login callbacks.
      const url = new URL(event.url)
      return { ...event, url: `${url.origin}${url.pathname}` }
    }} />
  </React.StrictMode>
)
