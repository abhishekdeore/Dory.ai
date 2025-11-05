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
  const [name, setName] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login, signup } = useAuthStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Validate inputs
      if (!email.trim() || !password.trim()) {
        throw new Error('Email and password are required')
      }

      if (isSignup) {
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters')
        }
        await signup(email.trim(), password, name.trim() || email.split('@')[0])
      } else {
        await login(email.trim(), password)
      }

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
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
                {isSignup && (
                  <Input
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                )}
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
                  minLength={8}
                />
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                      {isSignup ? 'Creating Account...' : 'Signing In...'}
                    </>
                  ) : (
                    <>{isSignup ? 'Sign Up' : 'Sign In'}</>
                  )}
                </Button>
                <p className="text-center text-sm text-gray-400">
                  {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignup(!isSignup)
                      setError(null)
                    }}
                    className="text-blue-400 hover:underline"
                    disabled={isLoading}
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
