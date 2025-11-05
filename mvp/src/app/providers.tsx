'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/store'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const setUser = useAuthStore(state => state.setUser)

  useEffect(() => {
    // Check for saved user on mount
    const savedUser = localStorage.getItem('dory_user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [setUser])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
