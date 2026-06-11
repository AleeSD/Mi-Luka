import { RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { router } from '@/routes'

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{
              style: {
                borderRadius: '1rem',
                fontFamily: 'inherit',
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
