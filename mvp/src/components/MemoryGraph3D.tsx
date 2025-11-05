'use client'

import { useEffect, useRef, memo, useCallback } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import * as THREE from 'three'

interface MemoryGraph3DProps {
  data: {
    nodes: any[]
    edges: any[]
  }
}

const MemoryGraph3D = memo(function MemoryGraph3D({ data }: MemoryGraph3DProps) {
  const graphRef = useRef<any>()

  useEffect(() => {
    if (graphRef.current) {
      // Center graph on mount
      setTimeout(() => {
        graphRef.current?.zoomToFit(400)
      }, 500)
    }
  }, [data])

  const transformedData = {
    nodes: data.nodes.map((node: any) => ({
      id: node.id,
      name: node.content?.substring(0, 50) || 'Memory',
      fullContent: node.content || 'Memory',
      val: (node.importance_score || 0.5) * 20,
      color: getNodeColor(node.freshness || 0, node.importance_score || 0.5),
      importance: node.importance_score || 0.5,
      freshness: node.freshness || 0,
      daysUntilExpiry: node.days_until_expiry || 30,
    })),
    links: data.edges.map((edge: any) => ({
      source: edge.source_memory_id,
      target: edge.target_memory_id,
      label: edge.relationship_type || 'related_to',
      strength: edge.strength || 0.5,
      relationshipType: edge.relationship_type || 'related_to',
    })),
  }

  function getNodeColor(freshness: number, importance: number) {
    // Color based on memory freshness (age)
    // Fresh memories: Green tones
    // Medium age: Yellow/Orange tones
    // Stale memories: Red/Orange tones

    if (freshness > 0.7) {
      // Fresh memory (0-33% of retention period)
      return importance >= 0.7 ? '#00E676' : '#4CAF50' // Bright green for fresh
    } else if (freshness > 0.4) {
      // Medium age (33-60% of retention period)
      return importance >= 0.7 ? '#FFD54F' : '#FFC107' // Yellow for medium age
    } else if (freshness > 0.2) {
      // Aging (60-80% of retention period)
      return importance >= 0.7 ? '#FF9800' : '#FF6F00' // Orange for aging
    } else {
      // Stale/Near expiry (80-100% of retention period)
      return importance >= 0.7 ? '#FF5252' : '#D32F2F' // Red for stale
    }
  }

  function getLinkColor(relationshipType: string) {
    switch (relationshipType) {
      case 'contradicts':
        return '#FF5252' // Red - contradictions
      case 'extends':
        return '#4CAF50' // Green - extensions
      case 'related_to':
        return '#2196F3' // Blue - related
      case 'inferred':
        return '#9C27B0' // Purple - inferred
      case 'temporal':
        return '#FF9800' // Orange - temporal
      case 'causal':
        return '#00BCD4' // Cyan - causal
      default:
        return '#64B5F6' // Light blue - default
    }
  }

  const handleNodeClick = (node: any) => {
    // Focus on clicked node
    const distance = 150
    const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z)

    if (graphRef.current) {
      graphRef.current.cameraPosition(
        {
          x: node.x * distRatio,
          y: node.y * distRatio,
          z: node.z * distRatio,
        },
        node,
        1000
      )
    }
  }

  // Custom node rendering with glow effect
  const nodeThreeObject = useCallback((node: any) => {
    const group = new THREE.Group()

    // Main sphere
    const geometry = new THREE.SphereGeometry(node.val || 5)
    const material = new THREE.MeshLambertMaterial({
      color: node.color,
      transparent: true,
      opacity: 0.9,
    })
    const sphere = new THREE.Mesh(geometry, material)
    group.add(sphere)

    // Glow effect
    const glowGeometry = new THREE.SphereGeometry(node.val * 1.2 || 6)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: node.color,
      transparent: true,
      opacity: 0.2,
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    group.add(glow)

    return group
  }, [])

  // Custom link rendering with labels using THREE.js Sprite
  const linkThreeObject = useCallback((link: any) => {
    // Create a canvas for the text
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return null

    canvas.width = 256
    canvas.height = 64

    // Draw background
    context.fillStyle = 'rgba(0, 0, 0, 0.7)'
    context.fillRect(0, 0, canvas.width, canvas.height)

    // Draw text
    context.font = 'Bold 20px Arial'
    context.fillStyle = getLinkColor(link.relationshipType)
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(link.label || '', canvas.width / 2, canvas.height / 2)

    // Create sprite
    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({ map: texture })
    const sprite = new THREE.Sprite(material)
    sprite.scale.set(15, 4, 1)

    return sprite
  }, [])

  const linkThreeObjectExtend = useCallback((link: any, obj: any) => {
    // Position the label at the midpoint of the link
    if (!obj) return // Guard against null objects

    const start = link.source
    const end = link.target

    if (start.x !== undefined && end.x !== undefined) {
      obj.position.x = (start.x + end.x) / 2
      obj.position.y = (start.y + end.y) / 2
      obj.position.z = (start.z + end.z) / 2
    }
  }, [])

  // Link color based on relationship type
  const linkColor = useCallback((link: any) => {
    return getLinkColor(link.relationshipType)
  }, [])

  // Link width based on strength
  const linkWidth = useCallback((link: any) => {
    return (link.strength || 0.5) * 3
  }, [])

  // Particle configuration for neural-like effect
  const linkDirectionalParticles = useCallback((link: any) => {
    // More particles for stronger relationships
    return Math.ceil((link.strength || 0.5) * 4)
  }, [])

  const linkDirectionalParticleSpeed = useCallback((link: any) => {
    // Faster particles for contradictions
    if (link.relationshipType === 'contradicts') return 0.01
    if (link.relationshipType === 'extends') return 0.008
    return 0.005
  }, [])

  return (
    <ForceGraph3D
      ref={graphRef}
      graphData={transformedData}
      nodeLabel={(node: any) => {
        const freshnessPercent = (node.freshness * 100).toFixed(0)
        const freshnessLabel =
          node.freshness > 0.7 ? '🟢 Fresh' :
          node.freshness > 0.4 ? '🟡 Medium' :
          node.freshness > 0.2 ? '🟠 Aging' :
          '🔴 Stale'
        const daysLeft = Math.max(0, Math.round(node.daysUntilExpiry))

        return `
          <div style="
            background: rgba(0, 0, 0, 0.9);
            padding: 10px 14px;
            border-radius: 6px;
            color: white;
            max-width: 320px;
            border-left: 3px solid ${node.color};
          ">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <strong>${freshnessLabel}</strong>
              <span style="opacity: 0.8;">${daysLeft} days left</span>
            </div>
            <div style="margin-bottom: 4px; opacity: 0.9;">
              Importance: ${(node.importance * 100).toFixed(0)}% | Freshness: ${freshnessPercent}%
            </div>
            <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 6px; margin-top: 6px;">
              ${node.fullContent}
            </div>
          </div>
        `
      }}
      nodeVal="val"
      nodeThreeObject={nodeThreeObject}
      linkThreeObject={linkThreeObject}
      linkThreeObjectExtend={linkThreeObjectExtend}
      linkColor={linkColor}
      linkWidth={linkWidth}
      linkDirectionalParticles={linkDirectionalParticles}
      linkDirectionalParticleSpeed={linkDirectionalParticleSpeed}
      linkDirectionalParticleWidth={2}
      linkOpacity={0.6}
      backgroundColor="#0a0f1e"
      onNodeClick={handleNodeClick}
      enableNodeDrag={true}
      d3AlphaDecay={0.02}
      d3VelocityDecay={0.3}
    />
  )
})

export default MemoryGraph3D
