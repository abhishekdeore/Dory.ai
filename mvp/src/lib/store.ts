import { create } from 'zustand'
import { API_BASE_URL } from './utils'

interface User {
  id: string
  email: string
  name: string
}

interface AuthStore {
  user: User | null
  apiKey: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  setUser: (user: User, apiKey: string) => void
  initAuth: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  apiKey: null,
  isAuthenticated: false,

  initAuth: () => {
    // Restore auth from localStorage on app start
    try {
      const storedUser = localStorage.getItem('dory_user')
      const storedApiKey = localStorage.getItem('dory_api_key')

      if (storedUser && storedApiKey) {
        const user = JSON.parse(storedUser)
        set({ user, apiKey: storedApiKey, isAuthenticated: true })
      }
    } catch (error) {
      console.error('Failed to restore auth:', error)
      localStorage.removeItem('dory_user')
      localStorage.removeItem('dory_api_key')
    }
  },

  login: async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      if (!data.success || !data.user) {
        throw new Error('Invalid response from server')
      }

      const user = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
      }

      const apiKey = data.user.apiKey

      set({ user, apiKey, isAuthenticated: true })
      localStorage.setItem('dory_user', JSON.stringify(user))
      localStorage.setItem('dory_api_key', apiKey)
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  },

  signup: async (email: string, password: string, name: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed')
      }

      if (!data.success || !data.user) {
        throw new Error('Invalid response from server')
      }

      const user = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
      }

      const apiKey = data.user.apiKey

      set({ user, apiKey, isAuthenticated: true })
      localStorage.setItem('dory_user', JSON.stringify(user))
      localStorage.setItem('dory_api_key', apiKey)
    } catch (error) {
      console.error('Signup error:', error)
      throw error
    }
  },

  logout: () => {
    set({ user: null, apiKey: null, isAuthenticated: false })
    localStorage.removeItem('dory_user')
    localStorage.removeItem('dory_api_key')
  },

  setUser: (user: User, apiKey: string) => {
    set({ user, apiKey, isAuthenticated: true })
    localStorage.setItem('dory_user', JSON.stringify(user))
    localStorage.setItem('dory_api_key', apiKey)
  },
}))

interface UIStore {
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
}))
