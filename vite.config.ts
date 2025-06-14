import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Increase chunk size warning limit since PDF libraries are inherently large
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor libraries into different chunks
          'react-vendor': ['react', 'react-dom'],
          'pdf-vendor': ['pdf-lib', 'pdfjs-dist'],
          'ui-vendor': ['react-hot-toast'],
        }
      }
    }
  }
})
