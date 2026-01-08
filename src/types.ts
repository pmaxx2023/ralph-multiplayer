export type ProjectId = string
export type StoryId = string
export type CriteriaId = string
export type UserId = string
export type AgentRunId = string

export type StoryStatus = 'draft' | 'approved' | 'in_progress' | 'passed' | 'blocked'
export type AgentStatus = 'running' | 'complete' | 'blocked' | 'cancelled'

export interface Project {
  id: ProjectId
  name: string
  goal: string
  techStack: string[]
  createdAt: Date
  createdBy: UserId
}

export interface Story {
  id: StoryId
  projectId: ProjectId
  priority: number
  title: string
  description: string
  status: StoryStatus
  assignedAgent: AgentRunId | null
  approvedBy: UserId[]
}

export interface AcceptanceCriteria {
  id: CriteriaId
  storyId: StoryId
  description: string
  passed: boolean
  evidence: string | null
}

export interface AgentRun {
  id: AgentRunId
  storyId: StoryId
  agentType: 'ralph' | 'reviewer' | 'writer'
  status: AgentStatus
  iteration: number
  maxIterations: number
  startedAt: Date
  endedAt: Date | null
  exitSignal: 'COMPLETE' | 'BLOCKED' | null
}

export interface ProgressEntry {
  id: string
  runId: AgentRunId
  iteration: number
  action: string
  filesChanged: string[]
  commitSha: string | null
  timestamp: Date
}

export interface UserPresence {
  userId: UserId
  name: string
  avatar: string
  cursor: { x: number; y: number } | null
  viewing: { type: 'story' | 'project'; id: string }
  editing: { type: 'story' | 'criteria'; id: string; field: string } | null
  lastSeen: Date
}

export interface CreateProjectRequest {
  name: string
  goal: string
  techStack: string[]
}

export interface CreateStoryRequest {
  projectId: ProjectId
  title: string
  description: string
  priority: number
  criteria: string[]
}

export interface UpdateStoryRequest {
  title?: string
  description?: string
  priority?: number
  status?: StoryStatus
}

export interface PRDView {
  project: Project
  stories: (Story & { criteria: AcceptanceCriteria[] })[]
  activeAgents: AgentRun[]
  onlineUsers: UserPresence[]
}

export interface BoardView {
  project: Project
  columns: {
    status: StoryStatus
    stories: Story[]
  }[]
  onlineUsers: UserPresence[]
}
