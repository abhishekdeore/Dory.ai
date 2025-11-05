'use client'

import { useAuthStore, useUIStore } from '@/lib/store'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Brain, MessageSquare, Plus, Network, Menu, LogOut } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useMemo } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore()
  const { logout } = useAuthStore()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  const handleLogout = useMemo(() => () => {
    logout()
    router.push('/')
  }, [logout, router])

  const navItems = useMemo(() => [
    { icon: Network, label: 'Knowledge Graph', href: '/dashboard' },
    { icon: MessageSquare, label: 'Chat', href: '/dashboard/chat' },
    { icon: Plus, label: 'Add Memory', href: '/dashboard/memories/new' },
  ], [])

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: 0 }}
        animate={{ x: sidebarOpen ? 0 : -300 }}
        className="fixed left-0 top-0 h-full w-64 bg-slate-900/50 backdrop-blur border-r border-slate-800 z-50"
      >
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-8">
            <Brain className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold">Dory.ai</h1>
          </div>

          <nav className="space-y-2 flex-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={pathname === item.href ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2"
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="space-y-4">
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
            <Button variant="outline" className="w-full gap-2" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <header className="sticky top-0 z-40 bg-slate-900/50 backdrop-blur border-b border-slate-800">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <Menu className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold">Dashboard</h2>
          </div>
        </header>

        <main className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
