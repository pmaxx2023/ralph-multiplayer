import { Hono } from 'hono'
import type { PRDView, BoardView, StoryStatus } from '@ralph/shared'
import { db } from '../db'

export const viewsRouter = new Hono()

// PRD View - renders project as JSON
viewsRouter.get('/prd/:projectId', async (c) => {
  const projectId = c.req.param('projectId')
  const project = db.getProject(projectId)

  if (!project) {
    return c.json({ error: 'Project not found' }, 404)
  }

  const stories = db.getStoriesByProject(projectId)
  const storiesWithCriteria = stories.map(story => ({
    ...story,
    criteria: db.getCriteriaByStory(story.id)
  }))

  const activeAgents = db.getRunningAgents().filter(run =>
    stories.some(s => s.id === run.storyId)
  )

  const view: PRDView = {
    project,
    stories: storiesWithCriteria,
    activeAgents,
    onlineUsers: [],
  }

  return c.json(view)
})

// PRD View as Markdown
viewsRouter.get('/prd/:projectId/markdown', async (c) => {
  const projectId = c.req.param('projectId')
  const project = db.getProject(projectId)

  if (!project) {
    return c.json({ error: 'Project not found' }, 404)
  }

  const stories = db.getStoriesByProject(projectId)
  const storiesWithCriteria = stories.map(story => ({
    ...story,
    criteria: db.getCriteriaByStory(story.id)
  }))

  let md = `# ${project.name}\n\n`
  md += `**Goal:** ${project.goal}\n\n`
  md += `**Tech Stack:** ${project.techStack.join(', ')}\n\n`
  md += `---\n\n`
  md += `## Stories\n\n`

  for (const story of storiesWithCriteria.sort((a, b) => a.priority - b.priority)) {
    const statusEmoji: Record<string, string> = {
      draft: '📝',
      approved: '✅',
      in_progress: '🔄',
      passed: '✓',
      blocked: '🚫',
    }

    md += `### ${statusEmoji[story.status] || '•'} Story ${story.priority}: ${story.title}\n\n`
    md += `${story.description}\n\n`
    md += `**Status:** ${story.status}\n\n`
    md += `**Acceptance Criteria:**\n`
    for (const criterion of story.criteria) {
      const check = criterion.passed ? '[x]' : '[ ]'
      md += `- ${check} ${criterion.description}\n`
    }
    md += `\n`
  }

  return c.text(md, 200, { 'Content-Type': 'text/markdown' })
})

// Board View - kanban columns by status
viewsRouter.get('/board/:projectId', async (c) => {
  const projectId = c.req.param('projectId')
  const project = db.getProject(projectId)

  if (!project) {
    return c.json({ error: 'Project not found' }, 404)
  }

  const stories = db.getStoriesByProject(projectId)
  const statuses: StoryStatus[] = ['draft', 'approved', 'in_progress', 'passed', 'blocked']

  const columns = statuses.map(status => ({
    status,
    stories: stories.filter(s => s.status === status),
  }))

  const view: BoardView = {
    project,
    columns,
    onlineUsers: [],
  }

  return c.json(view)
})
