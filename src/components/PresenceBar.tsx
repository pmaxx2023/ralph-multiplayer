import type { UserPresence } from '../types'

interface PresenceBarProps {
  users: UserPresence[]
}

export function PresenceBar({ users }: PresenceBarProps) {
  if (users.length === 0) {
    return (
      <div className="flex items-center text-sm text-gray-500">
        <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
        Just you
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {users.slice(0, 5).map((user, i) => (
        <div
          key={user.userId}
          className="relative"
          style={{ zIndex: users.length - i }}
          title={user.name}
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full border-2 border-white"
            />
          ) : (
            <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          {/* Online indicator */}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
        </div>
      ))}
      {users.length > 5 && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm text-gray-600">
          +{users.length - 5}
        </div>
      )}
    </div>
  )
}
