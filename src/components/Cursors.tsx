import { useOthers, useUpdateMyPresence } from '../liveblocks.config'
import { useEffect } from 'react'

export function Cursors() {
  const others = useOthers()
  const updateMyPresence = useUpdateMyPresence()

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      updateMyPresence({
        cursor: { x: e.clientX, y: e.clientY },
      })
    }

    const handlePointerLeave = () => {
      updateMyPresence({ cursor: null })
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerleave', handlePointerLeave)

    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [updateMyPresence])

  return (
    <>
      {others.map(({ connectionId, presence }) => {
        if (!presence?.cursor) return null

        return (
          <Cursor
            key={connectionId}
            x={presence.cursor.x}
            y={presence.cursor.y}
            name={presence.name}
            color={presence.color}
          />
        )
      })}
    </>
  )
}

interface CursorProps {
  x: number
  y: number
  name: string
  color: string
}

function Cursor({ x, y, name, color }: CursorProps) {
  return (
    <div
      className="pointer-events-none fixed top-0 left-0 z-50"
      style={{
        transform: `translate(${x}px, ${y}px)`,
      }}
    >
      {/* Cursor arrow */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
      >
        <path
          d="M5.65376 12.4563L11.3914 20.1239C11.6608 20.5133 12.3467 20.3213 12.3467 19.8426V14.1475C12.3467 13.595 12.794 13.1475 13.3467 13.1475H19.1206C19.6014 13.1475 19.7924 12.4577 19.3982 12.1921L6.24892 3.40913C5.77837 3.09358 5.14193 3.51973 5.28734 4.05653L5.65376 12.4563Z"
          fill={color}
        />
      </svg>
      {/* Name label */}
      <div
        className="absolute left-4 top-4 px-2 py-1 rounded text-xs text-white whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {name}
      </div>
    </div>
  )
}

export function CursorPresenceBar() {
  const others = useOthers()

  if (others.length === 0) {
    return (
      <div className="flex items-center text-sm text-gray-500">
        <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
        Just you
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {others.slice(0, 5).map(({ connectionId, presence }) => (
        <div
          key={connectionId}
          className="relative"
          title={presence?.name || 'Anonymous'}
        >
          <div
            className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-sm font-medium"
            style={{ backgroundColor: presence?.color || '#888' }}
          >
            {(presence?.name || 'A').charAt(0).toUpperCase()}
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
        </div>
      ))}
      {others.length > 5 && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm text-gray-600">
          +{others.length - 5}
        </div>
      )}
    </div>
  )
}
