import { createClient } from '@liveblocks/client'
import { createRoomContext } from '@liveblocks/react'

const client = createClient({
  publicApiKey: import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY || 'pk_dev_demo_xxxxxxxx',
  throttle: 16, // 60fps cursor updates
})

// Presence - what each user broadcasts to others
type Presence = {
  cursor: { x: number; y: number } | null
  name: string
  color: string
}

// Room context with types
export const {
  RoomProvider,
  useOthers,
  useUpdateMyPresence,
  useSelf,
  useRoom,
} = createRoomContext<Presence>(client)
