import { useState, useEffect, useCallback } from 'react'
import type { UserPresence } from '@ralph/shared'

const WS_HOST = 'ws://localhost:1999'

export function usePartySocket(projectId: string | null) {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [presence, setPresence] = useState<UserPresence[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!projectId) return

    const ws = new WebSocket(`${WS_HOST}/party/${projectId}`)

    ws.addEventListener('open', () => {
      setConnected(true)
      // Announce presence
      ws.send(JSON.stringify({
        type: 'presence.join',
        user: {
          userId: 'user-' + Math.random().toString(36).slice(2),
          name: 'Anonymous',
          avatar: '',
        },
      }))
    })

    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data)
      switch (data.type) {
        case 'presence.sync':
          setPresence(data.users)
          break
        case 'presence.join':
          setPresence((prev) => [...prev, data.user])
          break
        case 'presence.leave':
          setPresence((prev) => prev.filter((u) => u.userId !== data.userId))
          break
        case 'cursor.move':
          setPresence((prev) =>
            prev.map((u) =>
              u.userId === data.userId ? { ...u, cursor: data.cursor } : u
            )
          )
          break
      }
    })

    ws.addEventListener('close', () => {
      setConnected(false)
    })

    setSocket(ws)

    return () => {
      ws.close()
    }
  }, [projectId])

  const sendMessage = useCallback(
    (message: Record<string, unknown>) => {
      if (socket && connected) {
        socket.send(JSON.stringify(message))
      }
    },
    [socket, connected]
  )

  const updateCursor = useCallback(
    (cursor: { x: number; y: number }) => {
      sendMessage({ type: 'cursor.move', cursor })
    },
    [sendMessage]
  )

  return {
    connected,
    presence,
    sendMessage,
    updateCursor,
  }
}
