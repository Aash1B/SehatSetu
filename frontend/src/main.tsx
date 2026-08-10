import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Provider } from 'react-redux'
import { store } from './patient/store'
import './index.css'
import './i18n'
import App from './App.tsx'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()

const app = googleClientId ? (
  <GoogleOAuthProvider clientId={googleClientId}>
    <Provider store={store}>
      <App />
    </Provider>
  </GoogleOAuthProvider>
) : (
  <Provider store={store}>
    <App />
  </Provider>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {app}
  </StrictMode>,
)
