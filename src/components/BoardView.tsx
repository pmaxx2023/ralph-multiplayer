import type { BoardView, Story, StoryStatus } from '../types'

interface BoardViewComponentProps {
  data: BoardView
  onUpdate: () => void
}

export function BoardViewComponent({ data, onUpdate }: BoardViewComponentProps) {
  const { columns } = data

  const columnConfig: Record<StoryStatus, { title: string; color: string }> = {
    draft: { title: 'Draft', color: 'bg-gray-200' },
    approved: { title: 'Approved', color: 'bg-green-200' },
    in_progress: { title: 'In Progress', color: 'bg-blue-200' },
    passed: { title: 'Passed', color: 'bg-green-300' },
    blocked: { title: 'Blocked', color: 'bg-red-200' },
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => {
        const config = columnConfig[column.status]
        return (
          <div
            key={column.status}
            className="flex-shrink-0 w-72 bg-gray-50 rounded-lg p-4"
          >
            {/* Column header */}
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${config.color}`} />
              <h3 className="font-medium">{config.title}</h3>
              <span className="text-sm text-gray-500 ml-auto">
                {column.stories.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {column.stories
                .sort((a, b) => a.priority - b.priority)
                .map((story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    onUpdate={onUpdate}
                  />
                ))}
            </div>

            {/* Drop zone */}
            <div className="mt-3 p-4 border-2 border-dashed border-gray-200 rounded-lg text-center text-sm text-gray-400">
              Drop story here
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface StoryCardProps {
  story: Story
  onUpdate: () => void
}

function StoryCard({ story, onUpdate }: StoryCardProps) {
  return (
    <div
      className="bg-white rounded-lg shadow-sm border p-4 cursor-grab active:cursor-grabbing"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('storyId', story.id)
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-gray-500">#{story.priority}</span>
        {story.assignedAgent && (
          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
            🤖 Agent
          </span>
        )}
      </div>
      <h4 className="font-medium text-sm mb-2">{story.title}</h4>
      <p className="text-xs text-gray-500 line-clamp-2">{story.description}</p>
    </div>
  )
}
