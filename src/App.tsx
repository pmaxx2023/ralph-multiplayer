import { useState, useEffect, useCallback, useMemo } from 'react'
import type { PRDView, BoardView } from './types'
import { PRDDocument } from './components/PRDDocument'
import { BoardViewComponent } from './components/BoardView'
import { Cursors, CursorPresenceBar } from './components/Cursors'
import { RoomProvider, useUpdateMyPresence } from './liveblocks.config'

type ViewMode = 'prd' | 'board'

// Random user identity
function generateUser() {
  const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry']
  const colors = ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#009688', '#ff5722', '#795548']
  return {
    name: names[Math.floor(Math.random() * names.length)],
    color: colors[Math.floor(Math.random() * colors.length)],
  }
}

const PROJECT_KEY = 'ralph-project-id'
const snapshotKey = (id: string) => `ralph-snapshot-${id}`

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStored(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // storage blocked; the app still works for this session
  }
}

async function saveSnapshot(projectId: string) {
  try {
    const res = await fetch(`/api/projects/${projectId}/export`)
    if (res.ok) writeStored(snapshotKey(projectId), await res.text())
  } catch {
    // best effort
  }
}

function AppContent() {
  const [projectId, setProjectIdState] = useState<string | null>(() => readStored(PROJECT_KEY))
  const setProjectId = useCallback((id: string | null) => {
    setProjectIdState(id)
    writeStored(PROJECT_KEY, id)
  }, [])
  const [viewMode, setViewMode] = useState<ViewMode>('prd')
  const [prdData, setPrdData] = useState<PRDView | null>(null)
  const [boardData, setBoardData] = useState<BoardView | null>(null)
  const [loading, setLoading] = useState(false)

  const user = useMemo(() => generateUser(), [])
  const updateMyPresence = useUpdateMyPresence()

  // Set initial presence
  useEffect(() => {
    updateMyPresence({
      name: user.name,
      color: user.color,
      cursor: null,
    })
  }, [user, updateMyPresence])

  // Fetch project data
  const fetchData = useCallback(async () => {
    if (!projectId) return

    setLoading(true)
    try {
      const endpoint = viewMode === 'prd'
        ? `/api/views/prd/${projectId}`
        : `/api/views/board/${projectId}`

      let res = await fetch(endpoint)
      // The server keeps data in memory. If it lost this project, restore
      // it from the last snapshot this browser saved, then try again.
      if (res.status === 404) {
        const snapshot = readStored(snapshotKey(projectId))
        if (snapshot) {
          await fetch('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: snapshot })
          res = await fetch(endpoint)
        }
      }
      const data = await res.json()
      if (!res.ok) {
        setPrdData(null)
        setBoardData(null)
        // Gone for good: go back to the start screen instead of a blank page.
        if (res.status === 404) setProjectId(null)
        return
      }
      saveSnapshot(projectId)

      if (viewMode === 'prd') {
        setPrdData(data)
      } else {
        setBoardData(data)
      }
    } finally {
      setLoading(false)
    }
  }, [projectId, viewMode, setProjectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Demo: create project with sample stories
  const createDemoProject = async () => {
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
          <p className="text-gray-600 mb-2">Documents that can't go stale</p>
          <p className="text-sm text-gray-400 mb-8">
            You are <span className="font-medium" style={{ color: user.color }}>{user.name}</span>
          </p>
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
      {/* Live cursors layer */}
      <Cursors />

      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-40">
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
          <CursorPresenceBar />
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

function App() {
  // Use a fixed room for demo - in production, use projectId
  return (
    <RoomProvider
      id="ralph-multiplayer-demo"
      initialPresence={{ cursor: null, name: '', color: '' }}
    >
      <AppContent />
    </RoomProvider>
  )
}

export default App
