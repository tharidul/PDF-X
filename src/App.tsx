
import PDFToolbox from './components/PDFToolbox'
import ErrorBoundary from './components/ErrorBoundary'
import { Toaster } from 'react-hot-toast'

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary>
        <PDFToolbox />
      </ErrorBoundary>
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Define default options
          className: '',
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '14px',
            maxWidth: '500px',
          },
          // Default options for specific types
          success: {
            duration: 3000,
            style: {
              background: '#10b981',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#10b981',
            },
          },
          error: {
            duration: 5000,
            style: {
              background: '#ef4444',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#ef4444',
            },
          },
          loading: {
            style: {
              background: '#3b82f6',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#3b82f6',
            },
          },
        }}
      />
    </div>
  )
}

export default App
