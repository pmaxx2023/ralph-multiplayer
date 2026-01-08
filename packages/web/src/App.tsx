import { useState, useEffect, useCallback } from 'react'
import type { PRDView, BoardView } from '@ralph/shared'
import { PRDDocument } from './components/PRDDocument'
import { BoardViewComponent } from './components/BoardView'
import { PresenceBar } from './components/PresenceBar'
import { usePartySocket } from './hooks/usePartySocket'

type ViewMode = 'prd' | 'board'

function App() {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('prd')
  const [prdData, setPrdData] = useState<PRDView | null>(null)
  const [boardData, setBoardData] = useState<BoardView | null>(null)
  const [loading, setLoading] = useState(false)

  // Real-time connection
  const { presence } = usePartySocket(projectId)

  // Fetch project data
  const fetchData = useCallback(async () => {
    if (!projectId) return

    setLoading(true)
    try {
      const endpoint = viewMode === 'prd'
        ? `/api/views/prd/${projectId}`
        : `/api/views/board/${projectId}`

      const res = await fetch(endpoint)
      const data = await res.json()

      if (viewMode === 'prd') {
        setPrdData(data)
      } else {
        setBoardData(data)
      }
    } finally {
      setLoading(false)
    }
  }, [projectId, viewMode])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Demo: create project with sample stories
  const createDemoProject = async () => {
    // Create project
    const projectRes = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Demo Project',
        goal: 'Test the multiplayer PRD system',
        techStack: ['TypeScript', 'React', 'Hono'],
      }),
    })
    const project = await projectRes.json()

    // Create sample stories
    await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: project.id,
        title: 'User authentication',
        description: 'Implement user login and registration with JWT tokens',
        priority: 1,
        criteria: [
          'Users can register with email/password',
          'Users can login and receive JWT',
          'Protected routes require valid token',
        ],
      }),
    })

    await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: project.id,
        title: 'Dashboard view',
        description: 'Create main dashboard showing user data and recent activity',
        priority: 2,
        criteria: [
          'Dashboard displays user profile',
          'Shows recent activity feed',
          'Responsive on mobile',
        ],
      }),
    })

    await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: project.id,
        title: 'API rate limiting',
        description: 'Add rate limiting to prevent abuse',
        priority: 3,
        criteria: [
          'Limit to 100 requests per minute',
          'Return 429 when exceeded',
          'Include rate limit headers',
        ],
      }),
    })

    setProjectId(project.id)
  }

  if (!projectId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Ralph Multiplayer</h1>
          <p className="text-gray-600 mb-8">Documents that can't go stale</p>
          <button
            onClick={createDemoProject}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Demo Project
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{prdData?.project.name || 'Loading...'}</h1>
          <p className="text-sm text-gray-500">{prdData?.project.goal}</p>
        </div>
        <div className="flex items-center gap-4">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('prd')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                viewMode === 'prd' ? 'bg-white shadow' : 'text-gray-600'
              }`}
            >
              Document
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                viewMode === 'board' ? 'bg-white shadow' : 'text-gray-600'
              }`}
            >
              Board
            </button>
          </div>
          {/* Presence */}
          <PresenceBar users={presence} />
        </div>
      </header>

      {/* Main content */}
      <main className="p-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : viewMode === 'prd' && prdData ? (
          <PRDDocument data={prdData} onUpdate={fetchData} />
        ) : viewMode === 'board' && boardData ? (
          <BoardViewComponent data={boardData} onUpdate={fetchData} />
        ) : (
          <div className="text-center py-12 text-gray-500">No data</div>
        )}
      </main>
    </div>
  )
}

export default App
