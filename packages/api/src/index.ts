import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { projectsRouter } from './routes/projects'
import { storiesRouter } from './routes/stories'
import { viewsRouter } from './routes/views'
import { agentRouter } from './routes/agent'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors())

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'ralph-multiplayer-api' }))

// Routes
app.route('/projects', projectsRouter)
app.route('/stories', storiesRouter)
app.route('/views', viewsRouter)
app.route('/agent', agentRouter)

const port = process.env.PORT || 3001
console.log(`API server running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
