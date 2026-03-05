'use client'

import { useState, useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Plus, CheckCircle, FileText, Upload, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

type ActiveTab = 'text' | 'pdf'

interface PDFUploadResult {
  filename: string
  chunkCount: number
  numPages: number
  documentMemoryId: string
}

const MAX_PDF_BYTES = 2 * 1024 * 1024 // 2MB

export default function NewMemoryPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('text')
  const [content, setContent] = useState('')
  const [success, setSuccess] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [pdfResult, setPdfResult] = useState<PDFUploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const router = useRouter()

  const createMutation = useMutation({
    mutationFn: (content: string) => api.createMemory(content),
    onSuccess: () => {
      setSuccess(true)
      setContent('')
      queryClient.invalidateQueries({ queryKey: ['memoryGraph'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      setTimeout(() => router.push('/dashboard'), 2000)
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uploadPDFMutation = useMutation<any, Error, File>({
    mutationFn: (file: File) => api.uploadPDF(file),
    onSuccess: (data) => {
      setPdfResult({
        filename: data.filename,
        chunkCount: data.chunkCount,
        numPages: data.numPages,
        documentMemoryId: data.documentMemoryId,
      })
      queryClient.invalidateQueries({ queryKey: ['memoryGraph'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (error) => {
      setPdfError(error.message || 'Upload failed. Please try again.')
    },
  })

  const validateAndSetFile = (file: File) => {
    setPdfError(null)
    setPdfResult(null)
    if (file.type !== 'application/pdf') {
      setPdfError('Only PDF files are supported.')
      return
    }
    if (file.size > MAX_PDF_BYTES) {
      setPdfError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 2 MB.`)
      return
    }
    setPdfFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) validateAndSetFile(file)
  }, [])

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndSetFile(file)
  }

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    createMutation.mutate(content)
  }

  const handlePDFUpload = () => {
    if (!pdfFile) return
    uploadPDFMutation.mutate(pdfFile)
  }

  const clearPDF = () => {
    setPdfFile(null)
    setPdfError(null)
    setPdfResult(null)
    uploadPDFMutation.reset()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
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

  if (pdfResult) {
    return (
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Card className="bg-slate-900/50 border-slate-800 text-center p-12">
            <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-6" />
            <CardTitle className="text-3xl mb-4">PDF Imported!</CardTitle>
            <div className="text-sm text-muted-foreground space-y-1 mt-2">
              <span className="block text-white font-medium">{pdfResult.filename}</span>
              <span className="block">{pdfResult.numPages} page(s) parsed into {pdfResult.chunkCount} memory chunk(s).</span>
              <span className="block text-xs mt-2">All chunks are linked in the knowledge graph with sequential relationships.</span>
            </div>
            <div className="flex gap-3 mt-8 justify-center">
              <Button onClick={() => router.push('/dashboard')}>
                View Knowledge Graph
              </Button>
              <Button variant="outline" onClick={() => { clearPDF(); setPdfResult(null) }}>
                Upload Another PDF
              </Button>
            </div>
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
            Save information to your personal knowledge graph.
          </CardDescription>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 p-1 bg-slate-950/60 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'text'
                  ? 'bg-slate-700 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Plus className="w-4 h-4" />
              Text
            </button>
            <button
              onClick={() => setActiveTab('pdf')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'pdf'
                  ? 'bg-slate-700 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              PDF
              <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">Beta</span>
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {activeTab === 'text' && (
            <form onSubmit={handleTextSubmit} className="space-y-6">
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
                <p className="text-xs text-gray-400">{content.length} characters</p>
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
                <Button type="button" variant="outline" onClick={() => router.push('/dashboard')}>
                  Cancel
                </Button>
              </div>

              {createMutation.isError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  Failed to create memory. Please try again.
                </div>
              )}

              <div className="p-4 bg-slate-950/50 rounded-lg">
                <p className="text-sm font-medium mb-3">Example memories:</p>
                <div className="space-y-2 text-xs text-gray-400">
                  <p className="cursor-pointer hover:text-blue-400" onClick={() => setContent('I prefer using TypeScript over JavaScript for type safety')}>
                    • &quot;I prefer using TypeScript over JavaScript for type safety&quot;
                  </p>
                  <p className="cursor-pointer hover:text-blue-400" onClick={() => setContent('Next.js 15 introduces improved caching and React 19 support')}>
                    • &quot;Next.js 15 introduces improved caching and React 19 support&quot;
                  </p>
                  <p className="cursor-pointer hover:text-blue-400" onClick={() => setContent('Machine learning models need proper validation to avoid overfitting')}>
                    • &quot;Machine learning models need proper validation to avoid overfitting&quot;
                  </p>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'pdf' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <p className="text-sm text-gray-400">
                  Upload a text-based PDF. It will be split into ~900-token chunks with 100-token overlap,
                  each stored as a separate memory with sequential links in the knowledge graph.
                </p>
                <p className="text-xs text-gray-500">Max file size: 2 MB · Text-based PDFs only · Scanned/image PDFs not supported</p>
              </div>

              {!pdfFile ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/30'
                  }`}
                >
                  <Upload className="w-10 h-10 text-gray-500 mx-auto mb-4" />
                  <p className="text-sm font-medium text-gray-300 mb-1">
                    Drop your PDF here, or click to browse
                  </p>
                  <p className="text-xs text-gray-500">PDF files only, up to 2 MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </div>
              ) : (
                <div className="border border-slate-700 rounded-xl p-4 flex items-center gap-4 bg-slate-800/30">
                  <FileText className="w-8 h-8 text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{pdfFile.name}</p>
                    <p className="text-xs text-gray-400">{(pdfFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={clearPDF}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                    disabled={uploadPDFMutation.isPending}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {pdfError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {pdfError}
                </div>
              )}

              {uploadPDFMutation.isError && !pdfError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {uploadPDFMutation.error?.message || 'Upload failed. Please try again.'}
                </div>
              )}

              {uploadPDFMutation.isPending && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-sm flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin flex-shrink-0" />
                  <div>
                    <p className="font-medium">Processing PDF...</p>
                    <p className="text-xs text-blue-300/70 mt-0.5">Parsing text, generating embeddings, and building knowledge graph links. This may take a moment.</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handlePDFUpload}
                  disabled={!pdfFile || !!pdfError || uploadPDFMutation.isPending}
                  className="flex-1"
                >
                  {uploadPDFMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload PDF
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push('/dashboard')}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
