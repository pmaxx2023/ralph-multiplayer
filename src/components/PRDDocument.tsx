import { useState } from 'react'
import type { PRDView, Story, AcceptanceCriteria } from '../types'

interface PRDDocumentProps {
  data: PRDView
  onUpdate: () => void
}

export function PRDDocument({ data, onUpdate }: PRDDocumentProps) {
  const { project, stories, activeAgents } = data
  const [addingStory, setAddingStory] = useState(false)
  const [newStory, setNewStory] = useState({ title: '', description: '', criteria: '' })

  const handleAddStory = async () => {
    if (!newStory.title.trim()) return

    await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: project.id,
        title: newStory.title,
        description: newStory.description,
        priority: stories.length + 1,
        criteria: newStory.criteria.split('\n').filter(c => c.trim()),
      }),
    })
    setNewStory({ title: '', description: '', criteria: '' })
    setAddingStory(false)
    onUpdate()
  }

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
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Stories</h2>
          <button
            onClick={() => setAddingStory(true)}
            className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"
          >
            + Add Story
          </button>
        </div>

        {addingStory && (
          <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50">
            <input
              type="text"
              placeholder="Story title..."
              value={newStory.title}
              onChange={(e) => setNewStory({ ...newStory, title: e.target.value })}
              className="w-full text-lg font-semibold mb-3 p-2 border rounded"
              autoFocus
            />
            <textarea
              placeholder="Description..."
              value={newStory.description}
              onChange={(e) => setNewStory({ ...newStory, description: e.target.value })}
              className="w-full mb-3 p-2 border rounded resize-none"
              rows={2}
            />
            <textarea
              placeholder="Acceptance criteria (one per line)..."
              value={newStory.criteria}
              onChange={(e) => setNewStory({ ...newStory, criteria: e.target.value })}
              className="w-full mb-3 p-2 border rounded resize-none text-sm"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddStory}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Add Story
              </button>
              <button
                onClick={() => { setAddingStory(false); setNewStory({ title: '', description: '', criteria: '' }) }}
                className="px-3 py-1.5 text-gray-600 text-sm hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {stories.length === 0 && !addingStory ? (
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
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [title, setTitle] = useState(story.title)
  const [description, setDescription] = useState(story.description)
  const [addingCriteria, setAddingCriteria] = useState(false)
  const [newCriteria, setNewCriteria] = useState('')

  const statusConfig: Record<string, { emoji: string; color: string }> = {
    draft: { emoji: '📝', color: 'bg-gray-100 text-gray-700' },
    approved: { emoji: '✅', color: 'bg-green-100 text-green-700' },
    in_progress: { emoji: '🔄', color: 'bg-blue-100 text-blue-700' },
    passed: { emoji: '✓', color: 'bg-green-100 text-green-700' },
    blocked: { emoji: '🚫', color: 'bg-red-100 text-red-700' },
  }

  const { emoji, color } = statusConfig[story.status] || { emoji: '•', color: 'bg-gray-100' }

  const saveTitle = async () => {
    if (title !== story.title) {
      await fetch(`/api/stories/${story.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      onUpdate()
    }
    setEditingTitle(false)
  }

  const saveDescription = async () => {
    if (description !== story.description) {
      await fetch(`/api/stories/${story.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      onUpdate()
    }
    setEditingDesc(false)
  }

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

  const handleAddCriteria = async () => {
    if (!newCriteria.trim()) return
    await fetch(`/api/stories/${story.id}/criteria`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: newCriteria }),
    })
    setNewCriteria('')
    setAddingCriteria(false)
    onUpdate()
  }

  return (
    <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
      {/* Story header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-2xl">{emoji}</span>
          <div className="flex-1">
            {editingTitle ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                className="text-lg font-semibold w-full border-b-2 border-blue-500 outline-none bg-transparent"
                autoFocus
              />
            ) : (
              <h3
                onClick={() => setEditingTitle(true)}
                className="text-lg font-semibold cursor-text hover:bg-gray-50 rounded px-1 -mx-1"
                title="Click to edit"
              >
                Story {story.priority}: {story.title}
              </h3>
            )}
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
        {editingDesc ? (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            className="w-full text-gray-700 bg-white border rounded p-2 resize-none"
            rows={3}
            autoFocus
          />
        ) : (
          <p
            onClick={() => setEditingDesc(true)}
            className="text-gray-700 cursor-text hover:bg-gray-100 rounded p-1 -m-1 min-h-[1.5rem]"
            title="Click to edit"
          >
            {story.description || 'Click to add description...'}
          </p>
        )}
      </div>

      {/* Acceptance criteria */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-500">
            Acceptance Criteria
          </h4>
          <button
            onClick={() => setAddingCriteria(true)}
            className="text-xs text-blue-600 hover:underline"
          >
            + Add
          </button>
        </div>
        <ul className="space-y-2">
          {story.criteria.map((criterion) => (
            <CriterionItem
              key={criterion.id}
              criterion={criterion}
              onUpdate={onUpdate}
            />
          ))}
          {addingCriteria && (
            <li className="flex items-start gap-2">
              <input type="checkbox" disabled className="mt-1" />
              <input
                type="text"
                value={newCriteria}
                onChange={(e) => setNewCriteria(e.target.value)}
                onBlur={() => { if (!newCriteria) setAddingCriteria(false) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCriteria()
                  if (e.key === 'Escape') { setAddingCriteria(false); setNewCriteria('') }
                }}
                placeholder="New acceptance criterion..."
                className="flex-1 border-b border-blue-500 outline-none text-sm"
                autoFocus
              />
            </li>
          )}
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

interface CriterionItemProps {
  criterion: AcceptanceCriteria
  onUpdate: () => void
}

function CriterionItem({ criterion, onUpdate }: CriterionItemProps) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(criterion.description)

  const save = async () => {
    if (text !== criterion.description) {
      await fetch(`/api/criteria/${criterion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: text }),
      })
      onUpdate()
    }
    setEditing(false)
  }

  const togglePassed = async () => {
    await fetch(`/api/criteria/${criterion.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passed: !criterion.passed }),
    })
    onUpdate()
  }

  return (
    <li className="flex items-start gap-2 group">
      <input
        type="checkbox"
        checked={criterion.passed}
        onChange={togglePassed}
        className="mt-1 cursor-pointer"
      />
      {editing ? (
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          className="flex-1 border-b border-blue-500 outline-none text-sm"
          autoFocus
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className={`cursor-text hover:bg-gray-100 rounded px-1 -mx-1 ${
            criterion.passed ? 'line-through text-gray-400' : ''
          }`}
          title="Click to edit"
        >
          {criterion.description}
        </span>
      )}
    </li>
  )
}
