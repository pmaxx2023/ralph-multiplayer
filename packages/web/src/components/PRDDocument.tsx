import type { PRDView, Story, AcceptanceCriteria } from '@ralph/shared'

interface PRDDocumentProps {
  data: PRDView
  onUpdate: () => void
}

export function PRDDocument({ data, onUpdate }: PRDDocumentProps) {
  const { project, stories, activeAgents } = data

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border p-8">
      {/* Header */}
      <div className="mb-8 pb-6 border-b">
        <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
        <p className="text-gray-600 mb-4">{project.goal}</p>
        <div className="flex gap-2">
          {project.techStack.map((tech) => (
            <span
              key={tech}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Stories */}
      <div className="space-y-8">
        <h2 className="text-xl font-semibold">Stories</h2>
        {stories.length === 0 ? (
          <p className="text-gray-500">No stories yet. Add one to get started.</p>
        ) : (
          stories
            .sort((a, b) => a.priority - b.priority)
            .map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                activeAgent={activeAgents.find((a) => a.storyId === story.id)}
                onUpdate={onUpdate}
              />
            ))
        )}
      </div>
    </div>
  )
}

interface StoryCardProps {
  story: Story & { criteria: AcceptanceCriteria[] }
  activeAgent?: { iteration: number; status: string }
  onUpdate: () => void
}

function StoryCard({ story, activeAgent, onUpdate }: StoryCardProps) {
  const statusConfig: Record<string, { emoji: string; color: string }> = {
    draft: { emoji: '📝', color: 'bg-gray-100 text-gray-700' },
    approved: { emoji: '✅', color: 'bg-green-100 text-green-700' },
    in_progress: { emoji: '🔄', color: 'bg-blue-100 text-blue-700' },
    passed: { emoji: '✓', color: 'bg-green-100 text-green-700' },
    blocked: { emoji: '🚫', color: 'bg-red-100 text-red-700' },
  }

  const { emoji, color } = statusConfig[story.status] || { emoji: '•', color: 'bg-gray-100' }

  const handleApprove = async () => {
    await fetch(`/api/stories/${story.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    })
    onUpdate()
  }

  const handleStartAgent = async () => {
    await fetch('/api/agent/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId: story.id }),
    })
    onUpdate()
  }

  return (
    <div className="border rounded-lg p-6">
      {/* Story header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{emoji}</span>
          <div>
            <h3 className="text-lg font-semibold">
              Story {story.priority}: {story.title}
            </h3>
            <span className={`text-sm px-2 py-0.5 rounded ${color}`}>
              {story.status}
            </span>
          </div>
        </div>
        {activeAgent && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <span className="animate-pulse">●</span>
            Agent working (iteration {activeAgent.iteration})
          </div>
        )}
      </div>

      {/* Description */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <p className="text-gray-700">{story.description || 'No description'}</p>
      </div>

      {/* Acceptance criteria */}
      <div>
        <h4 className="text-sm font-medium text-gray-500 mb-2">
          Acceptance Criteria
        </h4>
        <ul className="space-y-2">
          {story.criteria.map((criterion) => (
            <li key={criterion.id} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={criterion.passed}
                readOnly
                className="mt-1"
              />
              <span className={criterion.passed ? 'line-through text-gray-400' : ''}>
                {criterion.description}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="mt-4 pt-4 border-t flex gap-2">
        {story.status === 'draft' && (
          <button
            onClick={handleApprove}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
          >
            Approve
          </button>
        )}
        {story.status === 'approved' && (
          <button
            onClick={handleStartAgent}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Start Agent
          </button>
        )}
      </div>
    </div>
  )
}
