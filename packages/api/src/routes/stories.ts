import { Hono } from 'hono'
import type { CreateStoryRequest, UpdateStoryRequest } from '@ralph/shared'
import { db } from '../db'
import { nanoid } from 'nanoid'

export const storiesRouter = new Hono()

// Create story with criteria
storiesRouter.post('/', async (c) => {
  const body = await c.req.json<CreateStoryRequest>()
  const storyId = nanoid()
  const now = new Date()

  const story = db.createStory({
    id: storyId,
    projectId: body.projectId,
    title: body.title,
    description: body.description,
    priority: body.priority,
    status: 'draft',
    assignedAgent: null,
    approvedBy: [],
  })

  const criteriaRecords = body.criteria.map((desc) => {
    const criterion = {
      id: nanoid(),
      storyId,
      description: desc,
      passed: false,
      evidence: null,
    }
    db.createCriteria(criterion)
    return criterion
  })

  db.addEvent({
    id: nanoid(),
    type: 'story.created',
    actorType: 'user',
    actorId: 'system',
    targetType: 'story',
    targetId: storyId,
    projectId: body.projectId,
    payload: body,
    timestamp: now,
  })

  return c.json({ ...story, criteria: criteriaRecords }, 201)
})

// Get story by ID
storiesRouter.get('/:id', async (c) => {
  const id = c.req.param('id')
  const story = db.getStory(id)

  if (!story) {
    return c.json({ error: 'Story not found' }, 404)
  }

  const criteria = db.getCriteriaByStory(id)
  return c.json({ ...story, criteria })
})

// Update story
storiesRouter.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<UpdateStoryRequest>()
  const now = new Date()

  const current = db.getStory(id)
  if (!current) {
    return c.json({ error: 'Story not found' }, 404)
  }

  const updated = db.updateStory(id, body)

  if (body.status && body.status !== current.status) {
    db.addEvent({
      id: nanoid(),
      type: 'story.status_changed',
      actorType: 'user',
      actorId: 'system',
      targetType: 'story',
      targetId: id,
      projectId: current.projectId,
      payload: { status: body.status, previousStatus: current.status },
      timestamp: now,
    })
  } else {
    db.addEvent({
      id: nanoid(),
      type: 'story.updated',
      actorType: 'user',
      actorId: 'system',
      targetType: 'story',
      targetId: id,
      projectId: current.projectId,
      payload: body,
      timestamp: now,
    })
  }

  return c.json(updated)
})

// List stories for a project
storiesRouter.get('/project/:projectId', async (c) => {
  const projectId = c.req.param('projectId')
  const projectStories = db.getStoriesByProject(projectId)
  return c.json(projectStories)
})
