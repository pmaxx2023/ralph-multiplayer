import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { cors } from 'hono/cors'
import { nanoid } from 'nanoid'

export const config = {
  runtime: 'edge',
}

// Types (inlined for Vercel)
type StoryStatus = 'draft' | 'approved' | 'in_progress' | 'passed' | 'blocked'

interface Assignee {
  id: string
  type: 'human' | 'agent'
  name: string
  color: string
  avatar?: string
}

interface Project {
  id: string
  name: string
  goal: string
  techStack: string[]
  createdAt: Date
  createdBy: string
}

interface TeamMember {
  id: string
  projectId: string
  type: 'human' | 'agent'
  name: string
  color: string
  avatar?: string
}

interface Story {
  id: string
  projectId: string
  priority: number
  title: string
  description: string
  status: StoryStatus
  assignees: Assignee[]
  approvedBy: string[]
  assignedAgent?: string
}

interface AcceptanceCriteria {
  id: string
  storyId: string
  description: string
  passed: boolean
  evidence: string | null
}

interface AgentRun {
  id: string
  storyId: string
  agentType: 'ralph' | 'reviewer' | 'writer'
  status: 'running' | 'complete' | 'blocked' | 'cancelled'
  iteration: number
  maxIterations: number
  startedAt: Date
  endedAt: Date | null
  exitSignal: 'COMPLETE' | 'BLOCKED' | null
}

interface ProgressEntry {
  id: string
  runId: string
  iteration: number
  action: string
  filesChanged: string[]
  commitSha: string | null
  timestamp: Date
}

// In-memory store
const db = {
  projects: new Map<string, Project>(),
  stories: new Map<string, Story>(),
  criteria: new Map<string, AcceptanceCriteria>(),
  agentRuns: new Map<string, AgentRun>(),
  progressEntries: new Map<string, ProgressEntry>(),
  teamMembers: new Map<string, TeamMember>(),
}

const app = new Hono().basePath('/api')

app.use('*', cors())

app.get('/', (c) => c.json({ status: 'ok', service: 'ralph-multiplayer-api' }))

app.post('/projects', async (c) => {
  const body = await c.req.json<{ name: string; goal: string; techStack: string[] }>()
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

app.post('/stories', async (c) => {
  const body = await c.req.json<{ projectId: string; title: string; description: string; priority: number; criteria: string[] }>()
  const storyId = nanoid()

  const story: Story = {
    id: storyId,
    projectId: body.projectId,
    title: body.title,
    description: body.description,
    priority: body.priority,
    status: 'draft',
    assignees: [],
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
  const body = await c.req.json<Partial<Story>>()
  const story = db.stories.get(id)
  if (!story) return c.json({ error: 'Not found' }, 404)

  const updated = { ...story, ...body }
  db.stories.set(id, updated)
  return c.json(updated)
})

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

  const teamMembers = Array.from(db.teamMembers.values()).filter(m => m.projectId === projectId)

  return c.json({ project, stories, activeAgents, onlineUsers: [], teamMembers })
})

app.get('/views/board/:projectId', (c) => {
  const projectId = c.req.param('projectId')
  const project = db.projects.get(projectId)
  if (!project) return c.json({ error: 'Not found' }, 404)

  const stories = Array.from(db.stories.values()).filter(s => s.projectId === projectId)
  const statuses: StoryStatus[] = ['draft', 'approved', 'in_progress', 'passed', 'blocked']
  const columns = statuses.map(status => ({ status, stories: stories.filter(s => s.status === status) }))

  const teamMembers = Array.from(db.teamMembers.values()).filter(m => m.projectId === projectId)

  return c.json({ project, columns, onlineUsers: [], teamMembers })
})

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
    })
  }

  return c.json(updated)
})

// Add criterion to story
app.post('/stories/:id/criteria', async (c) => {
  const storyId = c.req.param('id')
  const story = db.stories.get(storyId)
  if (!story) return c.json({ error: 'Story not found' }, 404)

  const body = await c.req.json<{ description: string }>()
  const criterion: AcceptanceCriteria = {
    id: nanoid(),
    storyId,
    description: body.description,
    passed: false,
    evidence: null,
  }
  db.criteria.set(criterion.id, criterion)
  return c.json(criterion, 201)
})

// Update criterion
app.patch('/criteria/:id', async (c) => {
  const id = c.req.param('id')
  const criterion = db.criteria.get(id)
  if (!criterion) return c.json({ error: 'Criterion not found' }, 404)

  const body = await c.req.json<Partial<AcceptanceCriteria>>()
  const updated = { ...criterion, ...body }
  db.criteria.set(id, updated)

  // Auto-complete: if all criteria passed, mark story as passed
  if (updated.passed) {
    const storyCriteria = Array.from(db.criteria.values()).filter(cr => cr.storyId === criterion.storyId)
    const allPassed = storyCriteria.every(cr => cr.passed)

    if (allPassed) {
      const story = db.stories.get(criterion.storyId)
      if (story && story.status !== 'passed') {
        db.stories.set(criterion.storyId, { ...story, status: 'passed' })
      }
    }
  }

  // If unchecking, revert story from passed if needed
  if (!updated.passed) {
    const story = db.stories.get(criterion.storyId)
    if (story && story.status === 'passed') {
      db.stories.set(criterion.storyId, { ...story, status: 'in_progress' })
    }
  }

  return c.json(updated)
})

// ============ Team Members ============

// Get team members for a project
app.get('/projects/:id/team', (c) => {
  const projectId = c.req.param('id')
  const members = Array.from(db.teamMembers.values()).filter(m => m.projectId === projectId)
  return c.json(members)
})

// Add team member to project
app.post('/projects/:id/team', async (c) => {
  const projectId = c.req.param('id')
  const project = db.projects.get(projectId)
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const body = await c.req.json<{ name: string; type: 'human' | 'agent'; color?: string; avatar?: string }>()
  const colors = ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#009688', '#ff5722', '#795548']

  const member: TeamMember = {
    id: nanoid(),
    projectId,
    type: body.type,
    name: body.name,
    color: body.color || colors[Math.floor(Math.random() * colors.length)],
    avatar: body.avatar,
  }
  db.teamMembers.set(member.id, member)
  return c.json(member, 201)
})

// Remove team member
app.delete('/team/:id', (c) => {
  const id = c.req.param('id')
  if (!db.teamMembers.has(id)) return c.json({ error: 'Member not found' }, 404)
  db.teamMembers.delete(id)
  return c.json({ success: true })
})

// ============ Story Assignments ============

// Assign member to story
app.post('/stories/:id/assign', async (c) => {
  const storyId = c.req.param('id')
  const story = db.stories.get(storyId)
  if (!story) return c.json({ error: 'Story not found' }, 404)

  const body = await c.req.json<{ memberId: string }>()
  const member = db.teamMembers.get(body.memberId)
  if (!member) return c.json({ error: 'Member not found' }, 404)

  // Check if already assigned
  if (story.assignees.some(a => a.id === member.id)) {
    return c.json({ error: 'Already assigned' }, 400)
  }

  const assignee: Assignee = {
    id: member.id,
    type: member.type,
    name: member.name,
    color: member.color,
    avatar: member.avatar,
  }

  const updated = { ...story, assignees: [...story.assignees, assignee] }
  db.stories.set(storyId, updated)
  return c.json(updated)
})

// Unassign member from story
app.post('/stories/:id/unassign', async (c) => {
  const storyId = c.req.param('id')
  const story = db.stories.get(storyId)
  if (!story) return c.json({ error: 'Story not found' }, 404)

  const body = await c.req.json<{ memberId: string }>()
  const updated = {
    ...story,
    assignees: story.assignees.filter(a => a.id !== body.memberId)
  }
  db.stories.set(storyId, updated)
  return c.json(updated)
})

// Snapshot and restore. The store lives in memory, so a cold start or a
// different instance can lose a project. The browser keeps a snapshot from
// export and sends it back through import when the server has lost it.
app.get('/projects/:id/export', (c) => {
  const id = c.req.param('id')
  const project = db.projects.get(id)
  if (!project) return c.json({ error: 'Project not found' }, 404)
  const stories = [...db.stories.values()].filter(s => s.projectId === id)
  const storyIds = new Set(stories.map(s => s.id))
  const criteria = [...db.criteria.values()].filter(cr => storyIds.has(cr.storyId))
  const agentRuns = [...db.agentRuns.values()].filter(r => storyIds.has(r.storyId))
  const runIds = new Set(agentRuns.map(r => r.id))
  const progressEntries = [...db.progressEntries.values()].filter(e => runIds.has(e.runId))
  const teamMembers = [...db.teamMembers.values()].filter(m => m.projectId === id)
  return c.json({ version: 1, project, stories, criteria, agentRuns, progressEntries, teamMembers })
})

app.post('/import', async (c) => {
  const snap = await c.req.json<any>().catch(() => null)
  const project = snap?.project
  if (!project?.id || typeof project.id !== 'string') return c.json({ error: 'Invalid snapshot' }, 400)
  const list = (v: unknown) => (Array.isArray(v) ? v.slice(0, 500) : [])
  const stories = list(snap.stories).filter((s: any) => s?.id && s.projectId === project.id)
  const storyIds = new Set(stories.map((s: any) => s.id))
  const criteria = list(snap.criteria).filter((cr: any) => cr?.id && storyIds.has(cr.storyId))
  const agentRuns = list(snap.agentRuns).filter((r: any) => r?.id && storyIds.has(r.storyId))
  const runIds = new Set(agentRuns.map((r: any) => r.id))
  const progressEntries = list(snap.progressEntries).filter((e: any) => e?.id && runIds.has(e.runId))
  const teamMembers = list(snap.teamMembers).filter((m: any) => m?.id && m.projectId === project.id)

  // Never overwrite what this instance already has; only fill gaps.
  const fill = <T,>(map: Map<string, T>, rows: any[]) => {
    for (const row of rows) if (!map.has(row.id)) map.set(row.id, row as T)
  }
  if (!db.projects.has(project.id)) db.projects.set(project.id, project)
  fill(db.stories, stories)
  fill(db.criteria, criteria)
  fill(db.agentRuns, agentRuns)
  fill(db.progressEntries, progressEntries)
  fill(db.teamMembers, teamMembers)
  return c.json({ restored: true, projectId: project.id })
})

export default handle(app)
