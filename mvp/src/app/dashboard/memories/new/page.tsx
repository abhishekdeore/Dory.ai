'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Plus, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

export default function NewMemoryPage() {
  const [content, setContent] = useState('')
  const [success, setSuccess] = useState(false)
  const queryClient = useQueryClient()
  const router = useRouter()

  const createMutation = useMutation({
    mutationFn: (content: string) => api.createMemory(content),
    onSuccess: () => {
      setSuccess(true)
      setContent('')
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['memoryGraph'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    createMutation.mutate(content)
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Card className="bg-slate-900/50 border-slate-800 text-center p-12">
            <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-6" />
            <CardTitle className="text-3xl mb-4">Memory Created!</CardTitle>
            <CardDescription>
              Your memory has been added to the knowledge graph. Redirecting...
            </CardDescription>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-6 h-6 text-blue-400" />
              Add New Memory
            </CardTitle>
            <CardDescription>
              Save information to your personal knowledge graph. It will be automatically analyzed and connected to related memories.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="content">Memory Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter anything you want to remember... facts, notes, ideas, learnings, etc."
                  rows={12}
                  className="resize-none"
                />
                <p className="text-xs text-gray-400">
                  {content.length} characters
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={!content.trim() || createMutation.isPending}
                  className="flex-1"
                >
                  {createMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Memory
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                >
                  Cancel
                </Button>
              </div>

              {createMutation.isError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  Failed to create memory. Please try again.
                </div>
              )}
            </form>

            {/* Example prompts */}
            <div className="mt-8 p-4 bg-slate-950/50 rounded-lg">
              <p className="text-sm font-medium mb-3">💡 Example memories:</p>
              <div className="space-y-2 text-xs text-gray-400">
                <p className="cursor-pointer hover:text-blue-400" onClick={() => setContent("I prefer using TypeScript over JavaScript for type safety")}>
                  • "I prefer using TypeScript over JavaScript for type safety"
                </p>
                <p className="cursor-pointer hover:text-blue-400" onClick={() => setContent("Next.js 15 introduces improved caching and React 19 support")}>
                  • "Next.js 15 introduces improved caching and React 19 support"
                </p>
                <p className="cursor-pointer hover:text-blue-400" onClick={() => setContent("Machine learning models need proper validation to avoid overfitting")}>
                  • "Machine learning models need proper validation to avoid overfitting"
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  )
}
