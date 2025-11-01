# Dory.ai Frontend - Memory Explorer

A beautiful, interactive web interface for exploring your Dory.ai knowledge graph and asking questions about your saved memories.

## Features

### 💬 Intelligent Chat Interface
- Ask natural language questions about your memories
- Get AI-powered answers with source citations
- View which memories were used to generate each answer
- Click on source memories to see full details

### 🌐 3D Knowledge Graph Visualization
- Interactive 3D visualization of your entire knowledge graph
- Color-coded nodes based on importance:
  - 🟢 Green: High importance (70%+)
  - 🟡 Yellow: Medium importance (40-70%)
  - 🔵 Blue: Low importance (<40%)
- Node size reflects importance + access frequency
- Animated relationship links between memories
- Auto-rotating camera (pauses during interaction)
- Interactive controls:
  - Click nodes to view details
  - Zoom, pan, and rotate with mouse
  - Center view and toggle labels
  - Switch between force and radial layouts

### ⚡ Real-time Performance Metrics
- Total response time
- Memory search time
- LLM generation time
- Network latency
- Visual progress bars and breakdowns

## Quick Start

### Prerequisites

1. **Backend Running**: Ensure the Dory.ai backend is running on `http://localhost:3000`
2. **API Key**: You need a valid API key from your Dory.ai installation
3. **Memories**: Have some memories saved in your database (use the Chrome extension)

### Installation

No installation needed! This is a vanilla HTML/CSS/JS application.

### Usage

1. **Open the Application**
   ```bash
   cd frontend
   # Open index.html in your browser
   # Windows:
   start index.html
   # macOS:
   open index.html
   # Linux:
   xdg-open index.html
   ```

   Or simply double-click `index.html` in your file explorer.

2. **Alternative: Use a Local Server** (Recommended)
   ```bash
   # Python 3
   python -m http.server 8080

   # Node.js (if you have http-server installed)
   npx http-server -p 8080

   # Then open: http://localhost:8080
   ```

3. **Enter Your API Key**
   - In the header, enter your Dory.ai API key
   - The key is saved in localStorage for convenience
   - Your memories and graph will load automatically

4. **Start Exploring!**
   - Ask questions in the chat interface
   - Explore your knowledge graph in 3D
   - Click nodes to see memory details
   - View performance metrics for each query

## Interface Guide

### Header Section
```
┌─────────────────────────────────────────────────────┐
│ 🧠 Dory.ai Memory Explorer          [API Key] [🔄] │
│ Ask questions about your memories...                │
└─────────────────────────────────────────────────────┘
```

- **API Key Input**: Enter and save your API key
- **Refresh Graph Button**: Reload the 3D graph data
- **Memory Count**: Shows total number of memories

### Chat Section (Left)
```
┌─────────────────────────┐
│ 💬 Ask Questions        │
├─────────────────────────┤
│                         │
│ [Your questions]        │
│ [AI answers]            │
│ [Source citations]      │
│                         │
├─────────────────────────┤
│ [Type your question...] │
│              [Send →]   │
└─────────────────────────┘
```

- Type questions in natural language
- Press Enter or click Send
- View answers with source citations
- Click sources to see full memory details

### Graph Section (Right)
```
┌───────────────────────────────┐
│ 🌐 3D Knowledge Graph         │
│        [📍] [🏷️] [Layout ▾]  │
├───────────────────────────────┤
│                               │
│     [3D Visualization]        │
│                               │
├───────────────────────────────┤
│ 🟢 High  🟡 Medium  🔵 Low   │
└───────────────────────────────┘
```

- **📍 Center**: Reset camera to default position
- **🏷️ Labels**: Toggle node labels on/off
- **Layout Dropdown**: Switch between force and radial layouts
- **Mouse Controls**:
  - Left-click + drag: Rotate
  - Right-click + drag: Pan
  - Scroll wheel: Zoom
  - Click node: View details and highlight connections

### Performance Metrics Panel (Bottom)
```
┌──────────────────────────────────────────────────┐
│ ⚡ Performance Metrics                       [×] │
├──────────────────────────────────────────────────┤
│ Total: 1.2s  │ Search: 360ms │ LLM: 720ms │...  │
│ ████████████ │ ███░░░░░░░░░░ │ ██████░░░░░ │    │
└──────────────────────────────────────────────────┘
```

- Appears automatically after each query
- Auto-hides after 10 seconds
- Shows detailed breakdown of response time

## Example Questions

Try asking questions like:
- "What programming languages do I like?"
- "What did I learn about databases?"
- "Tell me about my interests in AI"
- "What are my favorite books?"
- "Summarize what I know about React"

## Keyboard Shortcuts

- **Enter**: Send question (from chat input)
- **Shift + Enter**: New line in question input

## Browser Compatibility

Tested and working on:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

Requires:
- Modern browser with WebGL support (for 3D graph)
- JavaScript enabled
- LocalStorage enabled (for API key persistence)

## Troubleshooting

### "No API Key" error
- Enter your API key in the header input field
- Get your API key from your Dory.ai backend setup

### Graph not loading
- Ensure backend is running on `http://localhost:3000`
- Check browser console for CORS errors
- Verify you have memories in your database
- Click the "🔄 Refresh Graph" button

### "Failed to load graph data" error
- Backend might not be running
- Check API key is correct
- Verify CORS is enabled in backend
- Check browser console for detailed errors

### 3D graph appears black
- Your browser might not support WebGL
- Try a different browser
- Update your graphics drivers

### Performance is slow
- Large graphs (100+ nodes) may be slower
- Try the "Radial Layout" for better performance
- Reduce the number of visible labels

## Configuration

### Change API URL

Edit `app.js` line 2:
```javascript
const API_BASE_URL = 'http://your-backend-url:3000/api';
```

### Customize Graph Colors

Edit `graph.js` in the `getNodeColor()` function:
```javascript
function getNodeColor(node) {
    // Customize colors here
    if (importance >= 0.7) return '#4CAF50'; // High
    if (importance >= 0.4) return '#FFC107'; // Medium
    return '#2196F3'; // Low
}
```

### Adjust Auto-rotation Speed

Edit `graph.js` in the `initGraph()` function:
```javascript
setInterval(() => {
    angle += 0.3; // Change this value (default: 0.3)
    ...
}, 50); // Change interval (default: 50ms)
```

## Architecture

```
frontend/
├── index.html          # Main HTML structure
├── styles.css          # All styling and animations
├── app.js              # Chat, API calls, metrics
├── graph.js            # 3D graph visualization
└── README.md           # This file

Dependencies (CDN):
└── force-graph-3d      # 3D graph library (Three.js based)
```

## API Endpoints Used

- `GET /api/memories/stats/overview` - Memory count
- `GET /api/memories/graph/view` - Graph data (nodes + relationships)
- `POST /api/chat/ask` - Question answering with memories
- `GET /api/memories/:id` - Individual memory details

## Development

### Modify the UI
1. Edit `styles.css` for visual changes
2. Edit `index.html` for structure changes
3. Refresh browser to see changes (no build step needed)

### Add New Features
1. Add functionality to `app.js` or `graph.js`
2. Follow existing code patterns
3. Test thoroughly in browser

### Debug
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Use `window.doryState` to inspect application state
4. Use `window.loadGraph()` to reload graph manually

## Performance Tips

1. **For large graphs (100+ memories)**:
   - Use radial layout instead of force layout
   - Turn off labels
   - Consider filtering nodes by importance

2. **For slow queries**:
   - Check backend performance
   - Verify database indexes are created
   - Consider caching frequently accessed memories

3. **For smooth animations**:
   - Close other browser tabs
   - Ensure hardware acceleration is enabled
   - Update graphics drivers

## Future Enhancements

Possible improvements:
- [ ] Filter graph by date range
- [ ] Search within graph
- [ ] Export graph as image
- [ ] Dark/light theme toggle
- [ ] Conversation history
- [ ] Memory editing interface
- [ ] Advanced graph layouts (hierarchical, circular)
- [ ] Real-time updates via WebSocket

## License

Part of the Dory.ai project.

## Support

For issues or questions:
1. Check the [main README](../README.md)
2. Review [TECHNICAL_DOCUMENTATION.md](../TECHNICAL_DOCUMENTATION.md)
3. Check browser console for errors
4. Ensure backend is running and accessible

---

**Enjoy exploring your memories! 🧠✨**
