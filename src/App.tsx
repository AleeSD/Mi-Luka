import { RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { ProfileProvider } from '@/context/ProfileContext'
import { NotificationProvider } from '@/context/NotificationContext'
import { SaldoEditorProvider } from '@/context/SaldoEditorContext'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { router } from '@/routes'

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ProfileProvider>
            <NotificationProvider>
              <SaldoEditorProvider>
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
              </SaldoEditorProvider>
            </NotificationProvider>
          </ProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
