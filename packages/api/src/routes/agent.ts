import { Hono } from 'hono'
import { db } from '../db'
import { nanoid } from 'nanoid'

export const agentRouter = new Hono()

// Start an agent run on a story
agentRouter.post('/start', async (c) => {
  const body = await c.req.json<{ storyId: string; agentType?: string; maxIterations?: number }>()
  const runId = nanoid()
  const now = new Date()

  const story = db.getStory(body.storyId)
  if (!story) {
    return c.json({ error: 'Story not found' }, 404)
  }

  const existingRun = db.getRunningAgentByStory(body.storyId)
  if (existingRun) {
    return c.json({ error: 'Agent already running on this story', runId: existingRun.id }, 409)
  }

  const run = db.createAgentRun({
    id: runId,
    storyId: body.storyId,
    agentType: (body.agentType || 'ralph') as 'ralph' | 'reviewer' | 'writer',
    status: 'running',
    iteration: 0,
    maxIterations: body.maxIterations || 30,
    startedAt: now,
    endedAt: null,
    exitSignal: null,
  })

  db.updateStory(body.storyId, { status: 'in_progress', assignedAgent: runId })

  db.addEvent({
    id: nanoid(),
    type: 'agent.started',
    actorType: 'agent',
    actorId: runId,
    targetType: 'story',
    targetId: body.storyId,
    projectId: story.projectId,
    payload: { runId, agentType: run.agentType },
    timestamp: now,
  })

  return c.json(run, 201)
})

// Log progress from agent
agentRouter.post('/progress', async (c) => {
  const body = await c.req.json<{
    runId: string
    iteration: number
    action: string
    filesChanged?: string[]
    commitSha?: string
  }>()
  const now = new Date()

  const run = db.getAgentRun(body.runId)
  if (!run) {
    return c.json({ error: 'Run not found' }, 404)
  }
  if (run.status !== 'running') {
    return c.json({ error: 'Run is not active' }, 400)
  }

  const story = db.getStory(run.storyId)

  const entry = db.createProgressEntry({
    id: nanoid(),
    runId: body.runId,
    iteration: body.iteration,
    action: body.action,
    filesChanged: body.filesChanged || [],
    commitSha: body.commitSha || null,
    timestamp: now,
  })

  db.updateAgentRun(body.runId, { iteration: body.iteration })

  db.addEvent({
    id: nanoid(),
    type: 'agent.progress',
    actorType: 'agent',
    actorId: body.runId,
    targetType: 'story',
    targetId: run.storyId,
    projectId: story!.projectId,
    payload: body,
    timestamp: now,
  })

  return c.json(entry, 201)
})

// Complete an agent run
agentRouter.post('/complete', async (c) => {
  const body = await c.req.json<{ runId: string; exitSignal: 'COMPLETE' | 'BLOCKED' }>()
  const now = new Date()

  const run = db.getAgentRun(body.runId)
  if (!run) {
    return c.json({ error: 'Run not found' }, 404)
  }

  const story = db.getStory(run.storyId)

  const updatedRun = db.updateAgentRun(body.runId, {
    status: body.exitSignal === 'COMPLETE' ? 'complete' : 'blocked',
    endedAt: now,
    exitSignal: body.exitSignal,
  })

  const newStatus = body.exitSignal === 'COMPLETE' ? 'passed' : 'blocked'
  db.updateStory(run.storyId, { status: newStatus, assignedAgent: null })

  db.addEvent({
    id: nanoid(),
    type: body.exitSignal === 'COMPLETE' ? 'agent.completed' : 'agent.blocked',
    actorType: 'agent',
    actorId: body.runId,
    targetType: 'story',
    targetId: run.storyId,
    projectId: story!.projectId,
    payload: { exitSignal: body.exitSignal },
    timestamp: now,
  })

  return c.json(updatedRun)
})

// Get agent run status
agentRouter.get('/run/:id', async (c) => {
  const id = c.req.param('id')
  const run = db.getAgentRun(id)

  if (!run) {
    return c.json({ error: 'Run not found' }, 404)
  }

  const progress = db.getProgressByRun(id)
  return c.json({ ...run, progress })
})
