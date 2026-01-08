// In-memory store for demo (no Postgres required)
import type { Project, Story, AcceptanceCriteria, AgentRun, ProgressEntry } from '@ralph/shared'

interface Event {
  id: string
  type: string
  actorType: 'user' | 'agent'
  actorId: string
  targetType: string
  targetId: string
  projectId: string
  payload: Record<string, unknown>
  timestamp: Date
}

class InMemoryDB {
  projects: Map<string, Project> = new Map()
  stories: Map<string, Story> = new Map()
  criteria: Map<string, AcceptanceCriteria> = new Map()
  agentRuns: Map<string, AgentRun> = new Map()
  progressEntries: Map<string, ProgressEntry> = new Map()
  events: Event[] = []

  // Project methods
  createProject(project: Project) {
    this.projects.set(project.id, project)
    return project
  }

  getProject(id: string) {
    return this.projects.get(id)
  }

  getAllProjects() {
    return Array.from(this.projects.values())
  }

  // Story methods
  createStory(story: Story) {
    this.stories.set(story.id, story)
    return story
  }

  getStory(id: string) {
    return this.stories.get(id)
  }

  updateStory(id: string, updates: Partial<Story>) {
    const story = this.stories.get(id)
    if (story) {
      const updated = { ...story, ...updates }
      this.stories.set(id, updated)
      return updated
    }
    return null
  }

  getStoriesByProject(projectId: string) {
    return Array.from(this.stories.values()).filter(s => s.projectId === projectId)
  }

  // Criteria methods
  createCriteria(criterion: AcceptanceCriteria) {
    this.criteria.set(criterion.id, criterion)
    return criterion
  }

  getCriteriaByStory(storyId: string) {
    return Array.from(this.criteria.values()).filter(c => c.storyId === storyId)
  }

  // Agent run methods
  createAgentRun(run: AgentRun) {
    this.agentRuns.set(run.id, run)
    return run
  }

  getAgentRun(id: string) {
    return this.agentRuns.get(id)
  }

  updateAgentRun(id: string, updates: Partial<AgentRun>) {
    const run = this.agentRuns.get(id)
    if (run) {
      const updated = { ...run, ...updates }
      this.agentRuns.set(id, updated)
      return updated
    }
    return null
  }

  getRunningAgentByStory(storyId: string) {
    return Array.from(this.agentRuns.values()).find(
      r => r.storyId === storyId && r.status === 'running'
    )
  }

  getRunningAgents() {
    return Array.from(this.agentRuns.values()).filter(r => r.status === 'running')
  }

  // Progress methods
  createProgressEntry(entry: ProgressEntry) {
    this.progressEntries.set(entry.id, entry)
    return entry
  }

  getProgressByRun(runId: string) {
    return Array.from(this.progressEntries.values()).filter(p => p.runId === runId)
  }

  // Event methods
  addEvent(event: Event) {
    this.events.push(event)
    return event
  }
}

export const db = new InMemoryDB()
