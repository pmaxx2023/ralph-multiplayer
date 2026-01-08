import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { cors } from 'hono/cors'
import { nanoid } from 'nanoid'
import type {
  Project, Story, AcceptanceCriteria, AgentRun, ProgressEntry,
  CreateProjectRequest, CreateStoryRequest, UpdateStoryRequest,
  PRDView, BoardView, StoryStatus
} from '../packages/shared/src/index'

// In-memory store (resets on cold start - use database for production)
const db = {
  projects: new Map<string, Project>(),
  stories: new Map<string, Story>(),
  criteria: new Map<string, AcceptanceCriteria>(),
  agentRuns: new Map<string, AgentRun>(),
  progressEntries: new Map<string, ProgressEntry>(),
}

const app = new Hono().basePath('/api')

app.use('*', cors())

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'ralph-multiplayer-api' }))

// Projects
app.post('/projects', async (c) => {
  const body = await c.req.json<CreateProjectRequest>()
  const project: Project = {
    id: nanoid(),
    name: body.name,
    goal: body.goal,
    techStack: body.techStack,
    createdAt: new Date(),
    createdBy: 'system',
  }
  db.projects.set(project.id, project)
  return c.json(project, 201)
})

app.get('/projects/:id', (c) => {
  const project = db.projects.get(c.req.param('id'))
  if (!project) return c.json({ error: 'Not found' }, 404)
  return c.json(project)
})

app.get('/projects', (c) => {
  return c.json(Array.from(db.projects.values()))
})

// Stories
app.post('/stories', async (c) => {
  const body = await c.req.json<CreateStoryRequest>()
  const storyId = nanoid()

  const story: Story = {
    id: storyId,
    projectId: body.projectId,
    title: body.title,
    description: body.description,
    priority: body.priority,
    status: 'draft',
    assignedAgent: null,
    approvedBy: [],
  }
  db.stories.set(storyId, story)

  const criteriaList = body.criteria.map(desc => {
    const criterion: AcceptanceCriteria = {
      id: nanoid(),
      storyId,
      description: desc,
      passed: false,
      evidence: null,
    }
    db.criteria.set(criterion.id, criterion)
    return criterion
  })

  return c.json({ ...story, criteria: criteriaList }, 201)
})

app.get('/stories/:id', (c) => {
  const story = db.stories.get(c.req.param('id'))
  if (!story) return c.json({ error: 'Not found' }, 404)
  const criteria = Array.from(db.criteria.values()).filter(cr => cr.storyId === story.id)
  return c.json({ ...story, criteria })
})

app.patch('/stories/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<UpdateStoryRequest>()
  const story = db.stories.get(id)
  if (!story) return c.json({ error: 'Not found' }, 404)

  const updated = { ...story, ...body }
  db.stories.set(id, updated)
  return c.json(updated)
})

app.get('/stories/project/:projectId', (c) => {
  const projectId = c.req.param('projectId')
  const stories = Array.from(db.stories.values()).filter(s => s.projectId === projectId)
  return c.json(stories)
})

// Views
app.get('/views/prd/:projectId', (c) => {
  const projectId = c.req.param('projectId')
  const project = db.projects.get(projectId)
  if (!project) return c.json({ error: 'Not found' }, 404)

  const stories = Array.from(db.stories.values())
    .filter(s => s.projectId === projectId)
    .map(story => ({
      ...story,
      criteria: Array.from(db.criteria.values()).filter(cr => cr.storyId === story.id)
    }))

  const activeAgents = Array.from(db.agentRuns.values())
    .filter(r => r.status === 'running' && stories.some(s => s.id === r.storyId))

  const view: PRDView = { project, stories, activeAgents, onlineUsers: [] }
  return c.json(view)
})

app.get('/views/prd/:projectId/markdown', (c) => {
  const projectId = c.req.param('projectId')
  const project = db.projects.get(projectId)
  if (!project) return c.json({ error: 'Not found' }, 404)

  const stories = Array.from(db.stories.values())
    .filter(s => s.projectId === projectId)
    .map(story => ({
      ...story,
      criteria: Array.from(db.criteria.values()).filter(cr => cr.storyId === story.id)
    }))
    .sort((a, b) => a.priority - b.priority)

  const emoji: Record<string, string> = {
    draft: '📝', approved: '✅', in_progress: '🔄', passed: '✓', blocked: '🚫'
  }

  let md = `# ${project.name}\n\n**Goal:** ${project.goal}\n\n**Tech Stack:** ${project.techStack.join(', ')}\n\n---\n\n## Stories\n\n`

  for (const story of stories) {
    md += `### ${emoji[story.status] || '•'} Story ${story.priority}: ${story.title}\n\n`
    md += `${story.description}\n\n**Status:** ${story.status}\n\n**Acceptance Criteria:**\n`
    for (const cr of story.criteria) {
      md += `- [${cr.passed ? 'x' : ' '}] ${cr.description}\n`
    }
    md += '\n'
  }

  return c.text(md, 200, { 'Content-Type': 'text/markdown' })
})

app.get('/views/board/:projectId', (c) => {
  const projectId = c.req.param('projectId')
  const project = db.projects.get(projectId)
  if (!project) return c.json({ error: 'Not found' }, 404)

  const stories = Array.from(db.stories.values()).filter(s => s.projectId === projectId)
  const statuses: StoryStatus[] = ['draft', 'approved', 'in_progress', 'passed', 'blocked']
  const columns = statuses.map(status => ({ status, stories: stories.filter(s => s.status === status) }))

  const view: BoardView = { project, columns, onlineUsers: [] }
  return c.json(view)
})

// Agent
app.post('/agent/start', async (c) => {
  const body = await c.req.json<{ storyId: string; agentType?: string; maxIterations?: number }>()
  const story = db.stories.get(body.storyId)
  if (!story) return c.json({ error: 'Story not found' }, 404)

  const existing = Array.from(db.agentRuns.values()).find(r => r.storyId === body.storyId && r.status === 'running')
  if (existing) return c.json({ error: 'Agent already running', runId: existing.id }, 409)

  const run: AgentRun = {
    id: nanoid(),
    storyId: body.storyId,
    agentType: (body.agentType || 'ralph') as 'ralph' | 'reviewer' | 'writer',
    status: 'running',
    iteration: 0,
    maxIterations: body.maxIterations || 30,
    startedAt: new Date(),
    endedAt: null,
    exitSignal: null,
  }
  db.agentRuns.set(run.id, run)
  db.stories.set(body.storyId, { ...story, status: 'in_progress', assignedAgent: run.id })

  return c.json(run, 201)
})

app.post('/agent/progress', async (c) => {
  const body = await c.req.json<{ runId: string; iteration: number; action: string; filesChanged?: string[] }>()
  const run = db.agentRuns.get(body.runId)
  if (!run) return c.json({ error: 'Run not found' }, 404)
  if (run.status !== 'running') return c.json({ error: 'Run not active' }, 400)

  const entry: ProgressEntry = {
    id: nanoid(),
    runId: body.runId,
    iteration: body.iteration,
    action: body.action,
    filesChanged: body.filesChanged || [],
    commitSha: null,
    timestamp: new Date(),
  }
  db.progressEntries.set(entry.id, entry)
  db.agentRuns.set(body.runId, { ...run, iteration: body.iteration })

  return c.json(entry, 201)
})

app.post('/agent/complete', async (c) => {
  const body = await c.req.json<{ runId: string; exitSignal: 'COMPLETE' | 'BLOCKED' }>()
  const run = db.agentRuns.get(body.runId)
  if (!run) return c.json({ error: 'Run not found' }, 404)

  const updated: AgentRun = {
    ...run,
    status: body.exitSignal === 'COMPLETE' ? 'complete' : 'blocked',
    endedAt: new Date(),
    exitSignal: body.exitSignal,
  }
  db.agentRuns.set(body.runId, updated)

  const story = db.stories.get(run.storyId)
  if (story) {
    db.stories.set(run.storyId, {
      ...story,
      status: body.exitSignal === 'COMPLETE' ? 'passed' : 'blocked',
      assignedAgent: null,
    })
  }

  return c.json(updated)
})

export default handle(app)
