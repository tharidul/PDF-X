import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './utils/serviceWorker'

// Register service worker for better performance and offline capability
if (import.meta.env.PROD) {
  registerServiceWorker({
    onSuccess: () => {
      console.log('PDF-X is ready for offline use');
    },
    onUpdate: () => {
      console.log('New version of PDF-X available');
      // You could show a toast notification here to inform users
    },
    onError: (error) => {
      console.warn('Service worker registration failed:', error);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
