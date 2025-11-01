// 3D Graph Visualization using force-graph-3d
let graphInstance = null;
let graphData = { nodes: [], links: [] };
let showLabels = true;

// Initialize Graph
function initGraph() {
    const container = document.getElementById('graphContainer');

    // Clear loading indicator
    const loading = container.querySelector('.graph-loading');
    if (loading) {
        loading.remove();
    }

    // Create 3D force graph
    graphInstance = ForceGraph3D()(container)
        .graphData(graphData)
        .nodeLabel('label')
        .nodeColor(node => getNodeColor(node))
        .nodeVal(node => getNodeSize(node))
        .nodeOpacity(0.9)
        .linkColor(() => 'rgba(148, 163, 184, 0.3)')
        .linkWidth(link => link.strength * 2)
        .linkOpacity(0.6)
        .linkDirectionalParticles(2)
        .linkDirectionalParticleWidth(link => link.strength * 2)
        .linkDirectionalParticleSpeed(0.005)
        .onNodeClick(handleNodeClick)
        .onNodeHover(handleNodeHover)
        .backgroundColor('#0f172a')
        .showNavInfo(false);

    // Apply initial settings
    applyGraphSettings();

    // Center the graph initially
    setTimeout(() => {
        if (graphInstance) {
            graphInstance.zoomToFit(400);
        }
    }, 500);

    // Auto-rotate camera
    let angle = 0;
    setInterval(() => {
        if (graphInstance && !isUserInteracting()) {
            angle += 0.3;
            graphInstance.cameraPosition({
                x: Math.sin(angle * Math.PI / 180) * 300,
                z: Math.cos(angle * Math.PI / 180) * 300,
                y: 100
            });
        }
    }, 50);
}

// Load Graph Data from API
async function loadGraph() {
    if (!state.apiKey) {
        console.warn('No API key provided');
        return;
    }

    const container = document.getElementById('graphContainer');

    // Show loading indicator if graph is empty
    if (!graphInstance) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'graph-loading';
        loadingDiv.innerHTML = `
            <div class="spinner"></div>
            <p>Loading knowledge graph...</p>
        `;
        container.appendChild(loadingDiv);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/memories/graph/view`, {
            headers: {
                'x-api-key': state.apiKey
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load graph data');
        }

        const data = await response.json();
        console.log('Graph API response:', data);

        const graph = data.graph;

        if (!graph) {
            throw new Error('Graph data is missing from API response');
        }

        if (!graph.nodes || !graph.edges) {
            throw new Error(`Invalid graph structure: nodes=${!!graph.nodes}, edges=${!!graph.edges}`);
        }

        // Transform data for force-graph-3d
        graphData = transformGraphData(graph);

        // Initialize or update graph
        if (!graphInstance) {
            initGraph();
        } else {
            graphInstance.graphData(graphData);
        }

        console.log(`Loaded graph: ${graphData.nodes.length} nodes, ${graphData.links.length} links`);

    } catch (error) {
        console.error('Error loading graph:', error);
        const loading = container.querySelector('.graph-loading');
        if (loading) {
            loading.innerHTML = `
                <p style="color: var(--danger-color);">Error loading graph: ${error.message}</p>
                <button class="btn btn-secondary" onclick="loadGraph()">Retry</button>
            `;
        }
    }
}

// Transform Graph Data
function transformGraphData(apiGraph) {
    const nodes = apiGraph.nodes.map(node => ({
        id: node.id,
        label: truncateText(node.content, 50),
        content: node.content,
        type: node.content_type,
        importance: node.importance_score || 0.5,
        accessCount: node.access_count || 0,
        createdAt: node.created_at,
        metadata: node.metadata
    }));

    const links = apiGraph.edges.map(rel => ({
        source: rel.source_memory_id,
        target: rel.target_memory_id,
        type: rel.relationship_type,
        strength: rel.strength || 0.5,
        label: rel.relationship_type
    }));

    return { nodes, links };
}

// Get Node Color based on importance
function getNodeColor(node) {
    const importance = node.importance || 0.5;

    if (importance >= 0.7) {
        return '#4CAF50'; // Green - High importance
    } else if (importance >= 0.4) {
        return '#FFC107'; // Yellow - Medium importance
    } else {
        return '#2196F3'; // Blue - Low importance
    }
}

// Get Node Size based on importance and access count
function getNodeSize(node) {
    const importance = node.importance || 0.5;
    const accessCount = node.accessCount || 0;
    const baseSize = 5;

    // Size based on importance (5-15) + access count bonus
    return baseSize + (importance * 10) + Math.min(accessCount * 0.5, 10);
}

// Handle Node Click
function handleNodeClick(node) {
    if (!node) return;

    // Show memory detail modal
    showMemoryDetail(node.id);

    // Highlight connected nodes
    highlightConnectedNodes(node);

    // Focus camera on node
    if (graphInstance) {
        const distance = 150;
        const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

        graphInstance.cameraPosition(
            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
            node,
            1000
        );
    }
}

// Handle Node Hover
function handleNodeHover(node) {
    const container = document.getElementById('graphContainer');
    container.style.cursor = node ? 'pointer' : 'default';

    if (node && showLabels) {
        // Could show tooltip here
    }
}

// Highlight Connected Nodes
function highlightConnectedNodes(node) {
    if (!graphInstance || !node) return;

    const connectedNodeIds = new Set();
    const connectedLinkIds = new Set();

    // Find all connected nodes
    graphData.links.forEach(link => {
        if (link.source.id === node.id) {
            connectedNodeIds.add(link.target.id);
            connectedLinkIds.add(`${link.source.id}-${link.target.id}`);
        } else if (link.target.id === node.id) {
            connectedNodeIds.add(link.source.id);
            connectedLinkIds.add(`${link.source.id}-${link.target.id}`);
        }
    });

    // Update node and link styling
    graphInstance
        .nodeColor(n => {
            if (n.id === node.id) return '#FF6B6B'; // Clicked node - red
            if (connectedNodeIds.has(n.id)) return '#FFD93D'; // Connected nodes - bright yellow
            return getNodeColor(n); // Default color
        })
        .linkColor(link => {
            const linkId = `${link.source.id}-${link.target.id}`;
            if (connectedLinkIds.has(linkId)) {
                return 'rgba(255, 107, 107, 0.8)'; // Highlighted links - red
            }
            return 'rgba(148, 163, 184, 0.3)'; // Default
        });

    // Reset after 3 seconds
    setTimeout(() => {
        if (graphInstance) {
            graphInstance
                .nodeColor(getNodeColor)
                .linkColor(() => 'rgba(148, 163, 184, 0.3)');
        }
    }, 3000);
}

// Apply Graph Settings
function applyGraphSettings() {
    if (!graphInstance) return;

    const layout = document.getElementById('layoutSelect')?.value || 'force';

    if (layout === 'radial') {
        // Apply radial layout
        const radius = 200;
        graphData.nodes.forEach((node, i) => {
            const angle = (i / graphData.nodes.length) * Math.PI * 2;
            node.fx = radius * Math.cos(angle);
            node.fy = 0;
            node.fz = radius * Math.sin(angle);
        });
    } else {
        // Remove fixed positions for force layout
        graphData.nodes.forEach(node => {
            delete node.fx;
            delete node.fy;
            delete node.fz;
        });
    }

    graphInstance.graphData(graphData);
}

// Center Graph Camera
function centerGraph() {
    if (graphInstance) {
        graphInstance.zoomToFit(400);
    }
}

// Toggle Labels
function toggleLabels() {
    showLabels = !showLabels;

    if (graphInstance) {
        graphInstance.nodeLabel(showLabels ? 'label' : '');
    }

    const btn = document.getElementById('toggleLabelsBtn');
    if (btn) {
        btn.textContent = showLabels ? '🏷️ Labels' : '🏷️ No Labels';
    }
}

// Check if user is interacting
let lastInteractionTime = 0;
function isUserInteracting() {
    return (Date.now() - lastInteractionTime) < 5000; // 5 seconds
}

// Setup Graph Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Center Graph Button
    const centerBtn = document.getElementById('centerGraphBtn');
    if (centerBtn) {
        centerBtn.addEventListener('click', centerGraph);
    }

    // Toggle Labels Button
    const labelsBtn = document.getElementById('toggleLabelsBtn');
    if (labelsBtn) {
        labelsBtn.addEventListener('click', toggleLabels);
    }

    // Layout Select
    const layoutSelect = document.getElementById('layoutSelect');
    if (layoutSelect) {
        layoutSelect.addEventListener('change', applyGraphSettings);
    }

    // Track user interactions
    const graphContainer = document.getElementById('graphContainer');
    if (graphContainer) {
        ['mousedown', 'wheel', 'touchstart'].forEach(eventType => {
            graphContainer.addEventListener(eventType, () => {
                lastInteractionTime = Date.now();
            });
        });
    }
});

// Utility: Truncate Text
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Export for global access
window.loadGraph = loadGraph;
window.centerGraph = centerGraph;
window.toggleLabels = toggleLabels;

// Auto-load graph when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Give time for API key to load
        setTimeout(() => {
            if (state.apiKey) {
                loadGraph();
            }
        }, 500);
    });
} else {
    setTimeout(() => {
        if (state.apiKey) {
            loadGraph();
        }
    }, 500);
}
