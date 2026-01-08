import { Hono } from 'hono'
import type { CreateProjectRequest } from '@ralph/shared'
import { db } from '../db'
import { nanoid } from 'nanoid'

export const projectsRouter = new Hono()

// Create project
projectsRouter.post('/', async (c) => {
  const body = await c.req.json<CreateProjectRequest>()
  const id = nanoid()
  const now = new Date()

  const project = db.createProject({
    id,
    name: body.name,
    goal: body.goal,
    techStack: body.techStack,
    createdAt: now,
    createdBy: 'system',
  })

  db.addEvent({
    id: nanoid(),
    type: 'project.created',
    actorType: 'user',
    actorId: 'system',
    targetType: 'project',
    targetId: id,
    projectId: id,
    payload: body,
    timestamp: now,
  })

  return c.json(project, 201)
})

// Get project by ID
projectsRouter.get('/:id', async (c) => {
  const id = c.req.param('id')
  const project = db.getProject(id)

  if (!project) {
    return c.json({ error: 'Project not found' }, 404)
  }

  return c.json(project)
})

// List all projects
projectsRouter.get('/', async (c) => {
  const allProjects = db.getAllProjects()
  return c.json(allProjects)
})
