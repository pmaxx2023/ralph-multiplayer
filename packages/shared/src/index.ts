// Core domain types for ralph-multiplayer

export type ProjectId = string
export type StoryId = string
export type CriteriaId = string
export type EventId = string
export type UserId = string
export type AgentRunId = string

export type StoryStatus = 'draft' | 'approved' | 'in_progress' | 'passed' | 'blocked'
export type AgentStatus = 'running' | 'complete' | 'blocked' | 'cancelled'
export type ActorType = 'user' | 'agent'

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

export interface User {
  id: UserId
  name: string
  email: string
  role: 'stakeholder' | 'developer' | 'admin'
  avatarUrl: string
}

// Event sourcing types
export type EventType =
  | 'project.created'
  | 'project.updated'
  | 'story.created'
  | 'story.updated'
  | 'story.status_changed'
  | 'criteria.created'
  | 'criteria.updated'
  | 'criteria.passed'
  | 'agent.started'
  | 'agent.progress'
  | 'agent.completed'
  | 'agent.blocked'
  | 'comment.added'
  | 'comment.resolved'

export interface BaseEvent {
  id: EventId
  type: EventType
  actorType: ActorType
  actorId: string
  targetType: string
  targetId: string
  projectId: ProjectId
  timestamp: Date
}

export interface ProjectCreatedEvent extends BaseEvent {
  type: 'project.created'
  payload: Omit<Project, 'id' | 'createdAt'>
}

export interface StoryCreatedEvent extends BaseEvent {
  type: 'story.created'
  payload: Omit<Story, 'id' | 'status' | 'assignedAgent' | 'approvedBy'>
}

export interface StoryUpdatedEvent extends BaseEvent {
  type: 'story.updated'
  payload: Partial<Pick<Story, 'title' | 'description' | 'priority'>>
}

export interface StoryStatusChangedEvent extends BaseEvent {
  type: 'story.status_changed'
  payload: { status: StoryStatus; previousStatus: StoryStatus }
}

export interface AgentProgressEvent extends BaseEvent {
  type: 'agent.progress'
  payload: {
    runId: AgentRunId
    iteration: number
    action: string
    filesChanged: string[]
  }
}

export type DomainEvent =
  | ProjectCreatedEvent
  | StoryCreatedEvent
  | StoryUpdatedEvent
  | StoryStatusChangedEvent
  | AgentProgressEvent

// Presence types for multiplayer
export interface UserPresence {
  userId: UserId
  name: string
  avatar: string
  cursor: { x: number; y: number } | null
  viewing: { type: 'story' | 'project'; id: string }
  editing: { type: 'story' | 'criteria'; id: string; field: string } | null
  lastSeen: Date
}

// API request/response types
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

// View types (rendered from state)
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
