import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppRouter } from './routes'
import { useThemeStore } from './stores/themeStore'
import { ToastContainer } from './components/ui/toast'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

function App() {
  // Initialize theme on app load
  const { theme, setTheme } = useThemeStore()

  useEffect(() => {
    // Re-apply theme on mount to ensure it's set correctly
    setTheme(theme)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      <ToastContainer />
    </QueryClientProvider>
  )
}

export default App
