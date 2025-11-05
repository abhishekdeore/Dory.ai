'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Brain, Network, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'

const MemoryGraph3D = dynamic(() => import('@/components/MemoryGraph3D'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
    </div>
  ),
})

export default function DashboardPage() {
  // Fetch memory graph with caching
  const { data: graphData, isLoading: graphLoading, refetch: refetchGraph } = useQuery({
    queryKey: ['memoryGraph'],
    queryFn: async () => {
      const data = await api.getMemoryGraph()
      return data.graph
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Fetch stats with caching
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const data = await api.getStats()
      return data.stats
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  const statCards = [
    {
      title: 'Total Memories',
      value: stats?.total_memories || 0,
      icon: Brain,
      color: 'text-blue-400',
    },
    {
      title: 'Total Relationships',
      value: stats?.total_relationships || 0,
      icon: Network,
      color: 'text-purple-400',
    },
    {
      title: 'Avg Importance',
      value: stats?.average_importance ? `${(parseFloat(stats.average_importance) * 100).toFixed(0)}%` : '0%',
      icon: Zap,
      color: 'text-green-400',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((stat, i) => (
          <div key={i}>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>{stat.title}</CardDescription>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <CardTitle className="text-3xl">
                  {statsLoading ? (
                    <div className="animate-pulse bg-slate-800 h-8 w-16 rounded" />
                  ) : (
                    stat.value
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        ))}
      </div>

      {/* Graph */}
      <div>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>3D Knowledge Graph</CardTitle>
                <CardDescription>
                  Your memories visualized in 3D space - {graphData?.nodes?.length || 0} nodes, {graphData?.edges?.length || 0} connections
                </CardDescription>
              </div>
              <Button
                size="icon"
                variant="outline"
                onClick={() => refetchGraph()}
                disabled={graphLoading}
              >
                <RefreshCw className={`w-4 h-4 ${graphLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative">
            {/* Legend */}
            <div className="absolute top-4 right-4 z-10 bg-slate-900/95 border border-slate-700 rounded-lg p-4 text-sm backdrop-blur-sm max-w-xs">
              <h4 className="font-semibold mb-3 text-white text-base">Legend</h4>

              {/* Memory Freshness */}
              <div className="mb-4">
                <h5 className="font-medium mb-2 text-slate-200 text-xs uppercase tracking-wide">Memory Freshness</h5>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#00E676] rounded-full"></div>
                    <span className="text-slate-300">Fresh (0-30% age)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#FFD54F] rounded-full"></div>
                    <span className="text-slate-300">Medium (30-60% age)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#FF9800] rounded-full"></div>
                    <span className="text-slate-300">Aging (60-80% age)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#FF5252] rounded-full"></div>
                    <span className="text-slate-300">Stale (80-100% age)</span>
                  </div>
                </div>
              </div>

              {/* Relationship Types */}
              <div className="pt-3 border-t border-slate-700">
                <h5 className="font-medium mb-2 text-slate-200 text-xs uppercase tracking-wide">Relationships</h5>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-1 bg-[#FF5252] rounded"></div>
                    <span className="text-slate-300">contradicts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-1 bg-[#4CAF50] rounded"></div>
                    <span className="text-slate-300">extends</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-1 bg-[#2196F3] rounded"></div>
                    <span className="text-slate-300">related_to</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-1 bg-[#9C27B0] rounded"></div>
                    <span className="text-slate-300">inferred</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-700">
                <div className="text-xs text-slate-400 space-y-1">
                  <p>💡 Brighter = High importance</p>
                  <p>⏰ Memories expire after 30 days</p>
                  <p>🔄 Contradictions auto-update</p>
                </div>
              </div>
            </div>

            <div className="h-[600px]">
              {graphLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
                    <p className="text-gray-400">Loading knowledge graph...</p>
                  </div>
                </div>
              ) : graphData && graphData.nodes && graphData.nodes.length > 0 ? (
                <MemoryGraph3D data={graphData} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Brain className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">No memories yet</p>
                    <p className="text-sm text-gray-500">Add your first memory to see the graph</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
