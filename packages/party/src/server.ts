// Simple WebSocket server using Bun's native WebSocket support
import type { UserPresence } from '@ralph/shared'

interface RoomState {
  users: Map<string, UserPresence>
  sockets: Map<string, WebSocket>
}

const rooms = new Map<string, RoomState>()

function getOrCreateRoom(roomId: string): RoomState {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { users: new Map(), sockets: new Map() })
  }
  return rooms.get(roomId)!
}

function broadcast(room: RoomState, message: string, exclude?: string) {
  for (const [userId, socket] of room.sockets) {
    if (userId !== exclude && socket.readyState === WebSocket.OPEN) {
      socket.send(message)
    }
  }
}

const server = Bun.serve({
  port: 1999,
  fetch(req, server) {
    const url = new URL(req.url)

    // Health check
    if (url.pathname === '/') {
      return new Response(JSON.stringify({ status: 'ok', service: 'ralph-party' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // WebSocket upgrade
    if (url.pathname.startsWith('/party/')) {
      const roomId = url.pathname.replace('/party/', '')
      const success = server.upgrade(req, { data: { roomId } })
      if (success) return undefined
      return new Response('WebSocket upgrade failed', { status: 400 })
    }

    return new Response('Not found', { status: 404 })
  },
  websocket: {
    open(ws) {
      const roomId = (ws.data as { roomId: string }).roomId
      const room = getOrCreateRoom(roomId)

      // Send current state
      ws.send(JSON.stringify({
        type: 'presence.sync',
        users: Array.from(room.users.values())
      }))
    },
    message(ws, message) {
      const roomId = (ws.data as { roomId: string }).roomId
      const room = getOrCreateRoom(roomId)

      try {
        const data = JSON.parse(message as string)

        switch (data.type) {
          case 'presence.join': {
            const presence: UserPresence = {
              ...data.user,
              cursor: null,
              viewing: { type: 'project', id: roomId },
              editing: null,
              lastSeen: new Date(),
            }
            room.users.set(data.user.userId, presence)
            room.sockets.set(data.user.userId, ws)
            ;(ws.data as any).userId = data.user.userId

            broadcast(room, JSON.stringify({
              type: 'presence.join',
              user: presence
            }), data.user.userId)
            break
          }

          case 'cursor.move': {
            const userId = (ws.data as any).userId
            if (userId) {
              const user = room.users.get(userId)
              if (user) {
                user.cursor = data.cursor
                broadcast(room, JSON.stringify({
                  type: 'cursor.move',
                  userId,
                  cursor: data.cursor
                }), userId)
              }
            }
            break
          }

          case 'event': {
            broadcast(room, JSON.stringify({ type: 'event', event: data.event }))
            break
          }
        }
      } catch (e) {
        console.error('Failed to parse message:', e)
      }
    },
    close(ws) {
      const roomId = (ws.data as { roomId: string }).roomId
      const userId = (ws.data as any).userId
      const room = rooms.get(roomId)

      if (room && userId) {
        room.users.delete(userId)
        room.sockets.delete(userId)
        broadcast(room, JSON.stringify({
          type: 'presence.leave',
          userId
        }))
      }
    },
  },
})

console.log(`Party server running on ws://localhost:${server.port}`)
