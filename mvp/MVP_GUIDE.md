# Dory.ai MVP - Development Guide

## 🎯 What's Been Built

I've created the foundation for a world-class Next.js 15 MVP with:

### ✅ Completed Foundation
1. **Next.js 15 App Router** with TypeScript
2. **Tailwind CSS v3** with custom design tokens
3. **API Client** with bypass authentication (`test_key_12345`)
4. **Zustand Store** for state management
5. **UI Components**: Button, Input, Card (shadcn-inspired)
6. **Root Layout** with Providers (TanStack Query)
7. **Utility Functions** (cn, API config)

### 📁 Project Structure Created
```
mvp/
├── src/
│   ├── app/
│   │   ├── layout.tsx          ✅ Root layout
│   │   ├── providers.tsx       ✅ Query + Auth providers
│   │   └── globals.css         ✅ Tailwind + custom styles
│   ├── components/
│   │   └── ui/                ✅ Button, Input, Card
│   └── lib/
│       ├── api.ts             ✅ API client with bypass auth
│       ├── store.ts           ✅ Zustand stores (auth + UI)
│       └── utils.ts           ✅ Utilities
├── package.json               ✅ All dependencies
├── tsconfig.json             ✅ TypeScript config
├── tailwind.config.ts        ✅ Tailwind config
└── next.config.js            ✅ Next.js config
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd mvp
npm install
```

### 2. Set Environment Variables
Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### 3. Start Backend
In a separate terminal:
```bash
cd ../backend
npm run dev
```

### 4. Start Frontend
```bash
npm run dev
```

Open http://localhost:3001

## 🎨 Remaining Components to Build

### 1. Landing/Login Page (`src/app/page.tsx`)

Create a stunning landing page with Framer Motion animations:

```tsx
'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Brain, Sparkles, Network } from 'lucide-react'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const { login, signup } = useAuthStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSignup) {
      await signup(email, password, email.split('@')[0])
    } else {
      await login(email, password)
    }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.div
            className="inline-block mb-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Brain className="w-20 h-20 text-blue-500" />
          </motion.div>

          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Dory.ai
          </h1>
          <p className="text-2xl text-gray-300 mb-4">
            Your Personal AI Memory Layer
          </p>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Capture, organize, and retrieve information using an intelligent knowledge graph powered by semantic search
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {[
            { icon: Network, title: "3D Knowledge Graph", desc: "Visualize your memories in an interactive 3D space" },
            { icon: Sparkles, title: "AI-Powered Search", desc: "Find relevant information with semantic search" },
            { icon: Brain, title: "Smart Chat", desc: "Ask questions and get answers from your memories" }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 + 0.5 }}
            >
              <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
                <CardHeader>
                  <feature.icon className="w-12 h-12 text-blue-400 mb-4" />
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.desc}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1 }}
          className="max-w-md mx-auto"
        >
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader>
              <CardTitle>{isSignup ? 'Create Account' : 'Welcome Back'}</CardTitle>
              <CardDescription>
                {isSignup ? 'Sign up to start building your memory graph' : 'Sign in to access your memories'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full">
                  {isSignup ? 'Sign Up' : 'Sign In'}
                </Button>
                <p className="text-center text-sm text-gray-400">
                  {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <button
                    type="button"
                    onClick={() => setIsSignup(!isSignup)}
                    className="text-blue-400 hover:underline"
                  >
                    {isSignup ? 'Sign In' : 'Sign Up'}
                  </button>
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
```

### 2. Dashboard Layout (`src/app/dashboard/layout.tsx`)

Create a stunning sidebar layout:

```tsx
'use client'

import { useAuthStore, useUIStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Brain, MessageSquare, Plus, Network, Menu, LogOut } from 'lucide-react'
import { motion } from 'framer-motion'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const router = useRouter()

  if (!user) {
    router.push('/')
    return null
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const navItems = [
    { icon: Network, label: 'Knowledge Graph', href: '/dashboard' },
    { icon: MessageSquare, label: 'Chat', href: '/dashboard/chat' },
    { icon: Plus, label: 'Add Memory', href: '/dashboard/memories/new' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: sidebarOpen ? 0 : -300 }}
        className="fixed left-0 top-0 h-full w-64 bg-slate-900/50 backdrop-blur border-r border-slate-800 z-50"
      >
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <Brain className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold">Dory.ai</h1>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="absolute bottom-6 left-6 right-6">
            <div className="p-3 bg-slate-800/50 rounded-lg mb-4">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-gray-400">{user.email}</p>
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
          </div>
        </header>

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### 3. 3D Memory Graph (CENTERPIECE) (`src/app/dashboard/page.tsx`)

This is the wow factor that will impress VCs:

```tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useEffect, useRef, useState } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react'
import { motion } from 'framer-motion'

export default function DashboardPage() {
  const graphRef = useRef<any>()
  const [selectedNode, setSelectedNode] = useState<any>(null)

  // Fetch memory graph
  const { data: graphData, isLoading } = useQuery({
    queryKey: ['memoryGraph'],
    queryFn: async () => {
      const data = await api.getMemoryGraph()
      return transformGraphData(data.graph)
    },
  })

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.getStats(),
  })

  function transformGraphData(graph: any) {
    const nodes = graph.nodes.map((node: any) => ({
      id: node.id,
      name: node.content.substring(0, 50),
      val: (node.importance_score || 0.5) * 20,
      color: getNodeColor(node.importance_score || 0.5),
    }))

    const links = graph.edges.map((edge: any) => ({
      source: edge.source_memory_id,
      target: edge.target_memory_id,
      label: edge.relationship_type,
    }))

    return { nodes, links }
  }

  function getNodeColor(importance: number) {
    if (importance >= 0.7) return '#4CAF50'
    if (importance >= 0.4) return '#FFC107'
    return '#2196F3'
  }

  const handleNodeClick = (node: any) => {
    setSelectedNode(node)
    // Center camera on node
    const distance = 150
    const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z)
    graphRef.current?.cameraPosition(
      { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
      node,
      1000
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Memories</CardDescription>
              <CardTitle className="text-3xl">{stats?.stats?.total_memories || 0}</CardTitle>
            </CardHeader>
          </Card>
        </motion.div>
        {/* Add more stat cards... */}
      </div>

      {/* Graph */}
      <Card className="h-[600px]">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>3D Knowledge Graph</CardTitle>
              <CardDescription>Your memories visualized in 3D space</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" onClick={() => graphRef.current?.zoomToFit(400)}>
                <Maximize className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[500px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            </div>
          ) : (
            <ForceGraph3D
              ref={graphRef}
              graphData={graphData}
              nodeLabel="name"
              nodeAutoColorBy="color"
              nodeVal="val"
              linkDirectionalParticles={2}
              linkDirectionalParticleSpeed={0.005}
              backgroundColor="#0a0f1e"
              onNodeClick={handleNodeClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Selected Node Details */}
      {selectedNode && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle>Selected Memory</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{selectedNode.name}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
```

### 4. Chat Interface (`src/app/dashboard/chat/page.tsx`)

Create a beautiful chat interface - I can provide the complete code if needed.

### 5. Memory Creation (`src/app/dashboard/memories/new/page.tsx`)

Create a form to add new memories - I can provide the complete code if needed.

## 🎨 Design System

### Colors
- **Background**: Slate 950 with gradient overlays
- **Primary**: Blue 500 (#3B82F6)
- **Accent**: Purple 500 (#A855F7)
- **Cards**: Slate 900/50 with backdrop blur

### Animations
- Use Framer Motion for all page transitions
- Add floating and glow effects to key elements
- Smooth sidebar transitions

## 📦 Dependencies Included

- **Next.js 15**: Latest React framework
- **TanStack Query**: Data fetching & caching
- **Zustand**: State management
- **Framer Motion**: Animations
- **Radix UI**: Accessible components
- **Tailwind CSS**: Styling
- **react-force-graph-3d**: 3D graph visualization
- **Lucide Icons**: Beautiful icons

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
vercel deploy
```

### Docker
```bash
docker build -t dory-mvp .
docker run -p 3001:3000 dory-mvp
```

## 💡 Tips for Impressing VCs

1. **Focus on the 3D Graph**: This is your centerpiece - make it interactive and beautiful
2. **Show Real Data**: Import sample memories that demonstrate use cases
3. **Smooth Animations**: Every interaction should feel premium
4. **Performance**: Use TanStack Query for instant loading states
5. **Mobile Responsive**: Test on tablets for demos

## 📝 Next Steps

1. Complete the remaining pages (chat, memory creation)
2. Add more UI components as needed (from shadcn/ui)
3. Implement proper authentication (NextAuth.js)
4. Add real-time updates (WebSockets)
5. Polish animations and transitions
6. Create demo data/seed script
7. Add analytics (PostHog/Sentry)

## 🎯 Demo Script for VCs

1. **Landing**: "Here's Dory.ai - your personal AI memory layer"
2. **Sign In**: Quick demo login
3. **3D Graph**: "This is your knowledge graph in 3D - each node is a memory, size represents importance"
4. **Click Node**: "Click any memory to see details and connections"
5. **Chat**: "Ask questions about your memories - it uses semantic search"
6. **Add Memory**: "Adding new memories automatically builds relationships"

---

**Built with Next.js 15, React 19, Tailwind CSS v3, and modern best practices.**

For questions or issues, refer to the main README or open an issue.
