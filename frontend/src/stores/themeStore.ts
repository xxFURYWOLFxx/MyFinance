import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'light' | 'system'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  const effectiveTheme = theme === 'system' ? systemTheme : theme

  // Remove both classes first
  root.classList.remove('light', 'dark')
  // Add the correct class
  root.classList.add(effectiveTheme)

  // Also update the body background directly for immediate feedback
  if (effectiveTheme === 'light') {
    document.body.style.background = 'linear-gradient(135deg, hsl(220, 14%, 96%) 0%, hsl(220, 14%, 98%) 50%, hsl(0, 0%, 100%) 100%)'
  } else {
    document.body.style.background = 'linear-gradient(135deg, hsl(224, 71%, 4%) 0%, hsl(224, 71%, 8%) 50%, hsl(240, 60%, 6%) 100%)'
  }
  document.body.style.backgroundAttachment = 'fixed'

  console.log(`Theme applied: ${effectiveTheme} (requested: ${theme})`)
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme: Theme) => {
        applyTheme(theme)
        set({ theme })
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        // Apply theme after hydration
        if (state) {
          setTimeout(() => applyTheme(state.theme), 0)
        }
      },
    }
  )
)

// Apply theme on initial load
if (typeof window !== 'undefined') {
  // Apply stored theme on load
  const stored = localStorage.getItem('theme-storage')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (parsed.state?.theme) {
        applyTheme(parsed.state.theme)
      }
    } catch (e) {
      applyTheme('dark')
    }
  } else {
    applyTheme('dark')
  }

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const state = useThemeStore.getState()
    if (state.theme === 'system') {
      applyTheme('system')
    }
  })
}

export default useThemeStore
