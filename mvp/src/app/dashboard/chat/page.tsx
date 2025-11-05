'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Bot, User } from 'lucide-react'
import { motion } from 'framer-motion'

interface Message {
  role: 'user' | 'assistant'
  content: string
  memories?: any[]
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')

  const askMutation = useMutation({
    mutationFn: (question: string) => api.askQuestion(question),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          memories: data.memories,
        },
      ])
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || askMutation.isPending) return

    setMessages((prev) => [...prev, { role: 'user', content: input }])
    askMutation.mutate(input)
    setInput('')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-6 h-6 text-blue-400" />
              Chat with Your Memories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Messages */}
            <div className="h-[500px] overflow-y-auto space-y-4 p-4 bg-slate-950/50 rounded-lg">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <Bot className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <p>Ask me anything about your memories!</p>
                    <p className="text-sm mt-2">Try: "What do I know about programming?"</p>
                  </div>
                </div>
              ) : (
                messages.map((message, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-blue-400" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-blue-600'
                          : 'bg-slate-800'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      {message.memories && message.memories.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700">
                          <p className="text-xs text-gray-400 mb-2">
                            Sources ({message.memories.length}):
                          </p>
                          {message.memories.map((mem: any, j: number) => (
                            <div key={j} className="text-xs text-gray-400 mt-1">
                              • {mem.content.substring(0, 100)}...
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-purple-400" />
                      </div>
                    )}
                  </motion.div>
                ))
              )}
              {askMutation.isPending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about your memories..."
                className="flex-1 resize-none"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || askMutation.isPending}
                className="h-full aspect-square"
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </CardContent>
        </Card>
    </div>
  )
}
